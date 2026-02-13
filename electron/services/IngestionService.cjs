/**
 * IngestionService
 *
 * Manages dual-path file processing:
 * Path A: Copy original files to NAS (Local Archiving)
 * Path B: Resize & Upload to Cloudflare R2 (Cloud Gallery)
 *
 * Also generates thumbnails for fast previews and tracks
 * each image in the local session_images table.
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { ipcMain } = require('electron');

// Try to load optional dependencies
let sharp;
try {
  sharp = require('sharp');
  console.log('[IngestionService] Sharp loaded successfully');
} catch (err) {
  console.warn('[IngestionService] Sharp not available, image compression disabled');
}

let S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, getSignedUrl;
let awsSdkLoadError = null;
try {
  const awsSdk = require('@aws-sdk/client-s3');
  S3Client = awsSdk.S3Client;
  PutObjectCommand = awsSdk.PutObjectCommand;
  GetObjectCommand = awsSdk.GetObjectCommand;
  ListObjectsV2Command = awsSdk.ListObjectsV2Command;
  DeleteObjectsCommand = awsSdk.DeleteObjectsCommand;
  try {
    ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
  } catch (presignerErr) {
    console.warn('[IngestionService] S3 presigner not available, private object preview may fail');
  }
  console.log('[IngestionService] AWS SDK loaded successfully');
} catch (err) {
  awsSdkLoadError = err?.message || String(err);
  try {
    // Fallback path for some packaged Electron builds
    const awsSdkCjs = require('@aws-sdk/client-s3/dist-cjs/index.js');
    S3Client = awsSdkCjs.S3Client;
    PutObjectCommand = awsSdkCjs.PutObjectCommand;
    GetObjectCommand = awsSdkCjs.GetObjectCommand;
    ListObjectsV2Command = awsSdkCjs.ListObjectsV2Command;
    DeleteObjectsCommand = awsSdkCjs.DeleteObjectsCommand;
    try {
      ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner/dist-cjs/index.js'));
    } catch (presignerErr2) {
      console.warn('[IngestionService] S3 presigner fallback not available:', presignerErr2?.message || presignerErr2);
    }
    awsSdkLoadError = null;
    console.log('[IngestionService] AWS SDK loaded successfully via dist-cjs fallback');
  } catch (fallbackErr) {
    awsSdkLoadError = `${awsSdkLoadError} | fallback: ${fallbackErr?.message || fallbackErr}`;
    console.warn('[IngestionService] AWS SDK not available, cloud upload disabled:', awsSdkLoadError);
  }
}

class IngestionService {
  constructor(config = {}) {
    this.lastR2Error = null;
    const DEFAULT_R2_PUBLIC_URL = 'https://media.villahadad.org';

    const readEnv = (...keys) => {
      for (const key of keys) {
        const raw = process.env[key];
        if (typeof raw === 'string' && raw.trim()) {
          return raw.trim();
        }
      }
      return '';
    };

    // Cloudflare R2 Configuration (only if AWS SDK is available)
    console.log('[IngestionService] 🔍 Initializing R2...');
    console.log('[IngestionService]   AWS SDK available:', !!S3Client);
    console.log('[IngestionService]   env R2/VITE key exists:', !!readEnv('R2_ACCESS_KEY_ID', 'VITE_R2_ACCESS_KEY_ID'));
    console.log('[IngestionService]   env R2/VITE secret exists:', !!readEnv('R2_SECRET_ACCESS_KEY', 'VITE_R2_SECRET_ACCESS_KEY'));
    console.log('[IngestionService]   env R2/VITE bucket exists:', !!readEnv('R2_BUCKET_NAME', 'VITE_R2_BUCKET_NAME'));
    
    if (S3Client) {
      // Default R2 credentials embedded in the app - works out of the box!
      const DEFAULT_R2_ACCOUNT_ID = 'bb7bb29aae787d9ab910137068caade6';
      const DEFAULT_R2_ACCESS_KEY = 'aa5dc260697d6e796671760a9fbe240a';
      const DEFAULT_R2_SECRET_KEY = '58654a9815f514fbfecccbd1875da5a3a47f8817a33fb4c47eec6fd46b62cf65';
      const DEFAULT_R2_BUCKET = 'villahadad-gallery';
      
      const accountId = (config.r2AccountId || readEnv('R2_ACCOUNT_ID', 'VITE_R2_ACCOUNT_ID') || DEFAULT_R2_ACCOUNT_ID).toString().trim();
      const endpoint = (config.r2Endpoint || readEnv('R2_ENDPOINT', 'VITE_R2_ENDPOINT') || `https://${accountId}.r2.cloudflarestorage.com`).toString().trim();
      const accessKeyId = (config.r2AccessKey || readEnv('R2_ACCESS_KEY_ID', 'VITE_R2_ACCESS_KEY_ID') || DEFAULT_R2_ACCESS_KEY).toString().trim();
      const secretAccessKey = (config.r2SecretKey || readEnv('R2_SECRET_ACCESS_KEY', 'VITE_R2_SECRET_ACCESS_KEY') || DEFAULT_R2_SECRET_KEY).toString().trim();
      const resolvedBucket = (config.r2Bucket || readEnv('R2_BUCKET_NAME', 'VITE_R2_BUCKET_NAME') || DEFAULT_R2_BUCKET).toString().trim();
      const resolvedPublicUrl = (config.r2PublicUrl || readEnv('R2_PUBLIC_URL', 'VITE_R2_PUBLIC_URL') || DEFAULT_R2_PUBLIC_URL).toString().trim();

      this.r2Resolved = {
        accountId,
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucket: resolvedBucket,
        publicUrl: resolvedPublicUrl || null,
      };

      console.log('[IngestionService]   Resolved ACCESS_KEY length:', accessKeyId.length);
      console.log('[IngestionService]   Resolved SECRET_KEY length:', secretAccessKey.length);
      console.log('[IngestionService]   Resolved BUCKET:', resolvedBucket || 'NOT SET');

      if (!accessKeyId || !secretAccessKey || !resolvedBucket) {
        this.r2Enabled = false;
        this.r2Client = null;
        console.warn('[IngestionService] R2 DISABLED — missing credentials');
        console.warn('[IngestionService] R2_ACCESS_KEY_ID:', accessKeyId ? 'set (len=' + accessKeyId.length + ')' : '❌ empty');
        console.warn('[IngestionService] R2_SECRET_ACCESS_KEY:', secretAccessKey ? 'set (len=' + secretAccessKey.length + ')' : '❌ empty');
        console.warn('[IngestionService] R2_BUCKET_NAME:', resolvedBucket ? 'set' : '❌ empty');
      } else {
        try {
          this.r2Client = new S3Client({
            region: 'auto',
            endpoint: endpoint,
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
            // Increased timeout and retry logic for R2
            maxAttempts: 3,
          });

          this.r2Bucket = resolvedBucket;
          
          // IMPORTANT:
          // R2 public URLs are bucket-specific and cannot be safely derived from account ID.
          // Using pub-{accountId}.r2.dev leads to 401 in most setups.
          const explicitPublicUrl = resolvedPublicUrl;
          const invalidDerivedPattern = new RegExp(`^https://pub-${accountId}\\.r2\\.dev/?$`, 'i');
          if (explicitPublicUrl && !invalidDerivedPattern.test(explicitPublicUrl)) {
            this.r2PublicUrl = explicitPublicUrl.replace(/\/+$/, '');
          } else {
            this.r2PublicUrl = null;
            if (explicitPublicUrl && invalidDerivedPattern.test(explicitPublicUrl)) {
              console.warn('[IngestionService] Ignoring invalid R2_PUBLIC_URL (derived from account id).');
            }
          }
          
          this.r2Enabled = true;
          console.log('[IngestionService] R2 ENABLED');
          console.log('[IngestionService]   Endpoint:', endpoint);
          console.log('[IngestionService]   Bucket:', this.r2Bucket);
          console.log('[IngestionService]   Public URL:', this.r2PublicUrl || 'not set (will use signed URLs)');
          console.log('[IngestionService]   Key:', accessKeyId.substring(0, 6) + '...');
        } catch (r2InitError) {
          this.r2Enabled = false;
          this.r2Client = null;
          this.lastR2Error = r2InitError?.message || String(r2InitError);
          console.error('[IngestionService] R2 Initialization Failed:', r2InitError);
        }
      }
    } else {
      this.r2Enabled = false;
      this.lastR2Error = awsSdkLoadError || 'AWS SDK not available in Electron main process';
      console.warn('[IngestionService] R2 not initialized - AWS SDK not available');
    }

    this.nasRootPath = config.nasRootPath || process.env.NAS_ROOT_PATH || '/Volumes/Synology';
    this.localCachePath = config.localCachePath || path.join(require('electron').app.getPath('documents'), 'VillaHadad_Cache');

    // Processing settings (single JPEG for gallery + client download)
    this.jpegQuality = config.jpegQuality || 80;
    this.maxWidth = config.maxWidth || 4000;
    this.maxHeight = config.maxHeight || 4000;
    this.thumbWidth = config.thumbWidth || 400;
    this.thumbHeight = config.thumbHeight || 400;
    this.thumbQuality = config.thumbQuality || 60;

    // Reference to dbBridge — set via setDbBridge() after construction
    this.dbBridge = null;

    // Active file watchers (sessionId → FSWatcher)
    this.editWatchers = new Map();

    console.log('[IngestionService] Initialized (R2:', this.r2Enabled ? 'ON' : 'OFF', ')');
  }

  /**
   * Inject the DatabaseBridge so IngestionService can write to session_images.
   * Called from main.cjs after both services are ready.
   */
  setDbBridge(bridge) {
    this.dbBridge = bridge;
    console.log('[IngestionService] DatabaseBridge attached');
  }

  /**
   * Process files with dual-path strategy
   * @param {string[]} filePaths - Array of file paths to process
   * @param {Object} sessionInfo - { clientName, sessionId, bookingId, date }
   * @param {Function} progressCallback - (progress, status) => void
   */
  async processFiles(filePaths, sessionInfo, progressCallback = () => {}) {
    const results = {
      success: [],
      failed: [],
      cloudUrls: [],
      localPaths: [],
      thumbnailUrls: [],
      r2: {
        enabled: this.r2Enabled,
        bucket: this.r2Bucket || null,
        lastError: this.lastR2Error || null,
      },
    };

    const total = filePaths.length;

    // Ensure parent session record exists before inserting child session_images
    await this.insertOrUpdateSession(sessionInfo, total);

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      const fileName = path.basename(filePath);

      progressCallback(
        Math.round(((i + 1) / total) * 100),
        `Processing ${fileName}... (${i + 1}/${total})`
      );

      try {
        // Generate unique filename
        const uniqueId = `${Date.now()}_${i}`;
        const ext = path.extname(fileName);
        const baseName = path.basename(fileName, ext);

        // Path A: Copy to NAS/Cache (Raw folder)
        console.log(`[IngestionService] Path A: Copying ${fileName} to NAS/Cache...`);
        const localDestPath = await this.copyToNAS(filePath, sessionInfo, fileName);
        results.localPaths.push(localDestPath);
        console.log(`[IngestionService] Path A ✅: ${localDestPath}`);

        // Path B: Resize and upload to R2 (JPEG 4000px - gallery + client download)
        console.log(`[IngestionService] Path B: Uploading ${fileName} to R2...`);
        let cloudUrl = null;
        try {
          cloudUrl = await this.uploadToR2(filePath, sessionInfo, uniqueId);
        } catch (r2Error) {
          console.error(`[IngestionService] Path B failed for ${fileName}:`, r2Error.message);
          // Keep processing even if cloud upload fails.
        }
        results.cloudUrls.push(cloudUrl);
        console.log(`[IngestionService] Path B ${cloudUrl ? '✅' : '⚠️ skipped'}: ${cloudUrl || 'no R2'}`);

        // Path C: Generate thumbnail and upload to R2
        console.log(`[IngestionService] Path C: Uploading thumbnail...`);
        let thumbnailUrl = null;
        try {
          thumbnailUrl = await this.uploadThumbnailToR2(filePath, sessionInfo, uniqueId);
        } catch (thumbError) {
          console.error(`[IngestionService] Path C failed for ${fileName}:`, thumbError.message);
          // Non-fatal: image can still be used via original cloud/local path.
        }
        results.thumbnailUrls.push(thumbnailUrl);
        console.log(`[IngestionService] Path C ${thumbnailUrl ? '✅' : '⚠️ skipped'}: ${thumbnailUrl || 'no R2'}`);

        // Path D: Insert record into session_images table
        const imageId = crypto.randomUUID();
        await this.insertSessionImage({
          id: imageId,
          sessionId: sessionInfo.sessionId,
          bookingId: sessionInfo.bookingId || sessionInfo.sessionId,
          fileName,
          originalPath: localDestPath,
          cloudUrl,
          thumbnailUrl,
          status: 'pending',
          sortOrder: i,
          uploadedAt: new Date().toISOString(),
          syncedToCloud: cloudUrl ? 1 : 0,
        });

        results.success.push({
          id: imageId,
          original: filePath,
          local: localDestPath,
          cloud: cloudUrl,
          thumbnail: thumbnailUrl,
          fileName,
          r2Error: cloudUrl ? null : (this.lastR2Error || null),
        });

      } catch (error) {
        console.error(`[IngestionService] Failed to process ${fileName}:`, error);
        results.failed.push({
          filePath,
          error: error.message
        });
      }
    }

    // Finalize session: set uploadProgress=100 and status to 'selecting'
    await this.finalizeSession(sessionInfo.sessionId, results.failed.length > 0);

    progressCallback(100, 'Complete');
    results.r2.lastError = this.lastR2Error || null;
    return results;
  }

  /**
   * Path A: Copy original file to NAS (with local cache fallback)
   */
  async copyToNAS(sourcePath, sessionInfo, fileName) {
    const { clientName, sessionId, date, sessionPath } = sessionInfo;

    let targetDir;

    if (sessionPath) {
      // Use the existing session folder created by SessionDirectoryManager
      targetDir = path.join(sessionPath, '01_RAW');
      console.log(`[IngestionService] Using existing sessionPath: ${sessionPath}`);
    } else {
      // Fallback: build path from scratch (legacy)
      const dateObj = (date instanceof Date) ? date : new Date(date);
      const year = dateObj.getFullYear().toString();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const sanitizedClientName = this.sanitizeFolderName(clientName);
      const sessionFolderName = `${sanitizedClientName}_${sessionId}`;

      const nasAvailable = await fs.pathExists(this.nasRootPath);
      const rootPath = nasAvailable ? this.nasRootPath : this.localCachePath;

      targetDir = path.join(rootPath, year, month, sessionFolderName, '01_RAW');
      console.log(`[IngestionService] No sessionPath provided, built path: ${targetDir}`);
    }

    await fs.ensureDir(targetDir);

    const targetPath = path.join(targetDir, fileName);
    await fs.copy(sourcePath, targetPath);

    console.log(`[IngestionService] Path A saved: ${targetPath}`);
    return targetPath;
  }

  /**
   * Path B: Resize and upload to Cloudflare R2
   */
  async uploadToR2(sourcePath, sessionInfo, uniqueId) {
    // Skip if R2 is not initialized
    if (!this.r2Client) {
      console.warn('[IngestionService] R2 not available, skipping cloud upload');
      return null;
    }

    const { clientName, sessionId } = sessionInfo;
    const fileName = path.basename(sourcePath);
    const ext = path.extname(fileName);
    
    let buffer;
    let contentType;
    let r2Key;
    
    if (sharp) {
      try {
        // Resize image to JPEG (gallery + client download)
        buffer = await sharp(sourcePath)
          .resize({
            width: this.maxWidth,
            height: this.maxHeight,
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: this.jpegQuality, mozjpeg: true })
          .toBuffer();
        contentType = 'image/jpeg';
        r2Key = `sessions/${sessionId}/${uniqueId}_${path.basename(fileName, ext)}.jpg`;
      } catch (sharpError) {
        // Some formats (or corrupted files) fail to decode in sharp.
        // Fallback to original file upload so selector flow still works.
        console.warn(`[IngestionService] Sharp conversion failed for ${fileName}, uploading original:`, sharpError.message);
        buffer = await fs.readFile(sourcePath);
        contentType = this.getContentType(ext);
        r2Key = `sessions/${sessionId}/${uniqueId}_${fileName}`;
      }
    } else {
      // Fallback: upload original file without processing
      console.warn('[IngestionService] Sharp not available, uploading original file');
      buffer = await fs.readFile(sourcePath);
      contentType = this.getContentType(ext);
      r2Key = `sessions/${sessionId}/${uniqueId}_${fileName}`;
    }

    // Upload to R2
    // Note: HTTP headers must be ASCII-only, so we use sanitizeMetadataValue
    const command = new PutObjectCommand({
      Bucket: this.r2Bucket,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        'client-name': this.sanitizeMetadataValue(clientName),
        'session-id': sessionId,
        'original-filename': this.sanitizeMetadataValue(fileName)
      }
    });

    try {
      await this.r2Client.send(command);
    } catch (err) {
      this.lastR2Error = err?.message || String(err);
      throw err;
    }
    
    const publicUrl = await this.buildAccessibleR2Url(r2Key);
    
    console.log(`[IngestionService] Uploaded to R2: ${publicUrl}`);
    return publicUrl;
  }

  /**
   * Path C: Generate small thumbnail and upload to R2
   */
  async uploadThumbnailToR2(sourcePath, sessionInfo, uniqueId) {
    if (!this.r2Client || !sharp) return null;

    const { sessionId } = sessionInfo;
    const fileName = path.basename(sourcePath);
    const ext = path.extname(fileName);

    let buffer;
    try {
      buffer = await sharp(sourcePath)
        .resize({ width: this.thumbWidth, height: this.thumbHeight, fit: 'cover' })
        .webp({ quality: this.thumbQuality })
        .toBuffer();
    } catch (err) {
      console.warn(`[IngestionService] Thumbnail conversion failed for ${fileName}:`, err.message);
      return null;
    }

    const r2Key = `sessions/${sessionId}/thumbs/${uniqueId}_${path.basename(fileName, ext)}.webp`;

    const command = new PutObjectCommand({
      Bucket: this.r2Bucket,
      Key: r2Key,
      Body: buffer,
      ContentType: 'image/webp',
    });

    try {
      await this.r2Client.send(command);
    } catch (err) {
      this.lastR2Error = err?.message || String(err);
      throw err;
    }

    const publicUrl = await this.buildAccessibleR2Url(r2Key);

    return publicUrl;
  }

  /**
   * Build an object URL that can actually be opened by the renderer.
   * - Prefer explicit public URL if configured.
   * - Otherwise use a signed URL (works for private buckets).
   */
  async buildAccessibleR2Url(r2Key) {
    if (this.r2PublicUrl) {
      return `${this.r2PublicUrl}/${r2Key}`;
    }

    if (this.r2Client && this.r2Bucket && GetObjectCommand && getSignedUrl) {
      try {
        const getCmd = new GetObjectCommand({
          Bucket: this.r2Bucket,
          Key: r2Key,
        });
        // SigV4 max is 7 days.
        return await getSignedUrl(this.r2Client, getCmd, { expiresIn: 60 * 60 * 24 * 7 });
      } catch (err) {
        console.warn('[IngestionService] Failed to create signed URL:', err.message);
      }
    }

    // Last resort: enforce custom media domain instead of r2.dev fallback.
    return `https://media.villahadad.org/${r2Key}`;
  }

  /**
   * Insert a record into local session_images table via dbBridge.
   */
  async insertSessionImage(record) {
    if (!this.dbBridge) {
      console.warn('[IngestionService] No dbBridge — skipping session_images insert');
      return;
    }

    try {
      const sql = `INSERT OR IGNORE INTO session_images
        (id, sessionId, bookingId, fileName, originalPath, cloudUrl, thumbnailUrl, status, sortOrder, uploadedAt, syncedToCloud)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await this.dbBridge.query(sql, [
        record.id,
        record.sessionId,
        record.bookingId,
        record.fileName,
        record.originalPath,
        record.cloudUrl,
        record.thumbnailUrl,
        record.status,
        record.sortOrder,
        record.uploadedAt,
        record.syncedToCloud,
      ]);
    } catch (err) {
      console.error('[IngestionService] Failed to insert session_image:', err.message);
    }

    // Enqueue for Supabase sync (snake_case for Supabase)
    await this.enqueueSyncItem('upsert', 'session_image', {
      id: record.id,
      session_id: record.sessionId,
      booking_id: record.bookingId,
      file_name: record.fileName,
      original_path: record.originalPath,
      cloud_url: record.cloudUrl,
      thumbnail_url: record.thumbnailUrl,
      status: record.status,
      sort_order: record.sortOrder,
      uploaded_at: record.uploadedAt,
      synced_to_cloud: record.syncedToCloud === 1,
    });
  }

  /**
   * Enqueue a sync item for Supabase via the local sync_queue table.
   * Uses snake_case data format since Supabase tables use snake_case columns.
   */
  async enqueueSyncItem(action, entity, data) {
    if (!this.dbBridge) return;

    try {
      const syncId = crypto.randomUUID();
      const now = new Date().toISOString();
      await this.dbBridge.query(
        `INSERT OR REPLACE INTO sync_queue (id, action, entity, data, status, createdAt)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
        [syncId, action, entity, JSON.stringify(data), now]
      );
    } catch (err) {
      // Non-critical: sync will retry later
      console.warn(`[IngestionService] Failed to enqueue ${entity} sync:`, err.message);
    }
  }

  /**
   * Create or update a parent session record in the local sessions table.
   * Must be called BEFORE inserting session_images so the foreign key exists.
   */
  async insertOrUpdateSession(sessionInfo, imageCount) {
    if (!this.dbBridge) {
      console.warn('[IngestionService] No dbBridge — skipping session upsert');
      return;
    }

    try {
      const now = new Date().toISOString();
      const { sessionId, bookingId, clientName, sessionPath } = sessionInfo;

      // Check if session already exists
      const existing = await this.dbBridge.query(
        `SELECT id, totalImages FROM sessions WHERE id = ?`,
        [sessionId]
      );

      const existingRows = existing?.rows || [];

      if (existingRows.length > 0) {
        // Update existing session: add to totalImages count
        const currentTotal = existingRows[0].totalImages || 0;
        const newTotal = currentTotal + imageCount;

        await this.dbBridge.query(
          `UPDATE sessions SET totalImages = ?, uploadProgress = 0, updatedAt = ? WHERE id = ?`,
          [newTotal, now, sessionId]
        );

        console.log(`[IngestionService] Session ${sessionId} updated: totalImages ${currentTotal} -> ${newTotal}`);
      } else {
        // Create new session
        await this.dbBridge.query(
          `INSERT INTO sessions
            (id, bookingId, clientName, nasPath, status, totalImages, selectedImages,
             uploadProgress, selectionMethod, r2Cleaned, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, 'ingesting', ?, 0, 0, 'studio', 0, ?, ?)`,
          [
            sessionId,
            bookingId || sessionId,
            clientName,
            sessionPath || null,
            imageCount,
            now,
            now,
          ]
        );

        console.log(`[IngestionService] Session ${sessionId} created with ${imageCount} images`);
      }

      // Enqueue session sync to Supabase (snake_case for Supabase)
      await this.enqueueSyncItem('upsert', 'session', {
        id: sessionId,
        booking_id: bookingId || sessionId,
        client_name: clientName,
        nas_path: sessionPath || null,
        status: 'ingesting',
        total_images: imageCount,
        selected_images: 0,
        upload_progress: 0,
        selection_method: 'studio',
        r2_cleaned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[IngestionService] Failed to upsert session:', err.message);
    }
  }

  /**
   * Finalize session after all files have been processed.
   * Sets uploadProgress to 100% and status to 'selecting'.
   */
  async finalizeSession(sessionId, hasFailures) {
    if (!this.dbBridge) return;

    try {
      const status = hasFailures ? 'ingesting' : 'selecting';
      await this.dbBridge.query(
        `UPDATE sessions SET uploadProgress = 100, status = ?, updatedAt = ? WHERE id = ?`,
        [status, new Date().toISOString(), sessionId]
      );
      console.log(`[IngestionService] Session ${sessionId} finalized: status=${status}`);
    } catch (err) {
      console.error('[IngestionService] Failed to finalize session:', err.message);
    }
  }

  // ─── Edited Photo Detection ──────────────────────────────────

  /**
   * Watch the 03_EDITED folder for a given session.
   * When a new file appears, update the corresponding session_image status to 'editing'.
   * @param {string} sessionPath - Root session path on NAS
   * @param {string} sessionId - Session/booking ID
   */
  watchEditedFolder(sessionPath, sessionId) {
    const editedDir = path.join(sessionPath, '03_EDITED');

    // Don't double-watch
    if (this.editWatchers.has(sessionId)) return;

    // Ensure directory exists
    fs.ensureDirSync(editedDir);

    const watcher = fs.watch(editedDir, { persistent: false }, async (eventType, filename) => {
      if (!filename) return;
      if (eventType !== 'rename') return; // 'rename' fires on file creation

      const filePath = path.join(editedDir, filename);
      // Only react to actual files (not directory events or deletions)
      try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) return;
      } catch {
        return; // File was deleted or inaccessible
      }

      console.log(`[IngestionService] Edited file detected: ${filename} (session: ${sessionId})`);

      // Find matching session_image by original filename (strip _edited suffix)
      const baseName = this.stripEditedSuffix(filename);
      await this.markImageAsEdited(sessionId, baseName, filePath);
    });

    this.editWatchers.set(sessionId, watcher);
    console.log(`[IngestionService] Watching 03_EDITED for session: ${sessionId}`);
  }

  /**
   * Stop watching a session's edited folder.
   */
  unwatchEditedFolder(sessionId) {
    const watcher = this.editWatchers.get(sessionId);
    if (watcher) {
      watcher.close();
      this.editWatchers.delete(sessionId);
      console.log(`[IngestionService] Stopped watching 03_EDITED for: ${sessionId}`);
    }
  }

  /**
   * Strip _edited suffix from filename to match the original.
   * e.g. "IMG_001_edited.jpg" → "IMG_001"
   */
  stripEditedSuffix(filename) {
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    return base.replace(/_edited$/i, '');
  }

  /**
   * Mark a session_image as 'editing' when its edited version is detected.
   */
  async markImageAsEdited(sessionId, originalBaseName, editedPath) {
    if (!this.dbBridge) return;

    try {
      // Match by sessionId + fileName starts with the original base name
      const sql = `UPDATE session_images
        SET status = 'editing', updatedAt = ?
        WHERE sessionId = ? AND fileName LIKE ? AND status != 'final'`;

      await this.dbBridge.query(sql, [
        new Date().toISOString(),
        sessionId,
        `${originalBaseName}%`,
      ]);

      console.log(`[IngestionService] Marked ${originalBaseName} as 'editing' in session ${sessionId}`);
    } catch (err) {
      console.error('[IngestionService] Failed to mark image as edited:', err.message);
    }
  }

  /**
   * Scan 03_EDITED folder and bulk-mark any already-edited images.
   * Useful when the app starts and the designer has been working offline.
   */
  async scanEditedFolder(sessionPath, sessionId) {
    const editedDir = path.join(sessionPath, '03_EDITED');
    if (!await fs.pathExists(editedDir)) return { found: 0 };

    const files = await fs.readdir(editedDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp|tiff?)$/i.test(f));

    let marked = 0;
    for (const file of imageFiles) {
      const baseName = this.stripEditedSuffix(file);
      await this.markImageAsEdited(sessionId, baseName, path.join(editedDir, file));
      marked++;
    }

    console.log(`[IngestionService] Scan complete: ${marked} edited images found in ${sessionId}`);
    return { found: marked };
  }

  // ─── R2 Cleanup (45-day post-selection) ──────────────────────

  /**
   * Delete all R2 objects for a session (sessions/{sessionId}/*).
   * Called when 45 days have passed since client confirmed selection.
   */
  async cleanupR2Session(sessionId) {
    if (!this.r2Client || !this.r2Bucket) {
      console.warn('[IngestionService] R2 not available, skipping cleanup');
      return { deleted: 0 };
    }

    const prefix = `sessions/${sessionId}/`;
    let deleted = 0;
    let continuationToken;

    try {
      // List and delete in batches of 1000 (R2/S3 max)
      do {
        const listCmd = new ListObjectsV2Command({
          Bucket: this.r2Bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        });

        const listResult = await this.r2Client.send(listCmd);
        const objects = listResult.Contents || [];

        if (objects.length === 0) break;

        const deleteCmd = new DeleteObjectsCommand({
          Bucket: this.r2Bucket,
          Delete: {
            Objects: objects.map(obj => ({ Key: obj.Key })),
            Quiet: true,
          },
        });

        await this.r2Client.send(deleteCmd);
        deleted += objects.length;
        continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
      } while (continuationToken);

      console.log(`[IngestionService] R2 cleanup: deleted ${deleted} objects for session ${sessionId}`);
      return { deleted };
    } catch (err) {
      console.error(`[IngestionService] R2 cleanup failed for session ${sessionId}:`, err.message);
      throw err;
    }
  }

  /**
   * Run scheduled R2 cleanup — finds sessions where:
   *   r2CleanupAfter < NOW  AND  r2Cleaned = 0
   * Then deletes R2 objects and marks session as cleaned.
   */
  async runScheduledR2Cleanup() {
    if (!this.dbBridge) {
      console.warn('[IngestionService] No dbBridge, skipping R2 cleanup check');
      return { cleaned: 0 };
    }

    try {
      const now = new Date().toISOString();
      const queryResult = await this.dbBridge.query(
        `SELECT id, bookingId FROM sessions
         WHERE r2CleanupAfter IS NOT NULL
           AND r2CleanupAfter < ?
           AND r2Cleaned = 0`,
        [now]
      );

      const rows = queryResult?.rows || [];
      if (rows.length === 0) {
        console.log('[IngestionService] R2 cleanup check: nothing due');
        return { cleaned: 0 };
      }

      let cleaned = 0;
      for (const session of rows) {
        try {
          const result = await this.cleanupR2Session(session.id);

          // Mark as cleaned in local DB
          await this.dbBridge.query(
            `UPDATE sessions SET r2Cleaned = 1, updatedAt = ? WHERE id = ?`,
            [new Date().toISOString(), session.id]
          );

          // Notify renderer about cleanup completion
          this.sendCleanupNotification(session.id, session.bookingId, result.deleted);

          console.log(`[IngestionService] Session ${session.id} R2 cleaned (${result.deleted} objects)`);
          cleaned++;
        } catch (err) {
          console.error(`[IngestionService] Failed to clean session ${session.id}:`, err.message);
        }
      }

      console.log(`[IngestionService] R2 cleanup complete: ${cleaned}/${rows.length} sessions cleaned`);
      return { cleaned, total: rows.length };
    } catch (err) {
      console.error('[IngestionService] R2 scheduled cleanup error:', err.message);
      return { cleaned: 0, error: err.message };
    }
  }

  /**
   * Send R2 cleanup completion notification to the renderer process via IPC.
   * The renderer bridges this into localStorage + CustomEvent for NotificationCenter.
   */
  sendCleanupNotification(sessionId, bookingId, deletedCount) {
    try {
      const { BrowserWindow } = require('electron');
      const notification = {
        id: `r2-cleanup-${sessionId}-${Date.now()}`,
        title: 'تم مسح صور R2 تلقائياً',
        message: `الجلسة ${sessionId}: تم حذف ${deletedCount} صورة من R2 (انتهت مدة 45 يوم)`,
        time: new Date().toISOString(),
        read: false,
        type: 'r2_cleanup',
        targetRoles: ['manager', 'admin'],
        bookingId: bookingId || sessionId,
      };

      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('app:notification', notification);
        }
      });

      console.log(`[IngestionService] R2 cleanup notification sent for session ${sessionId}`);
    } catch (err) {
      console.error('[IngestionService] Failed to send cleanup notification:', err.message);
    }
  }

  // ─── Utility Methods ─────────────────────────────────────────

  /**
   * Get content type from file extension
   */
  getContentType(ext) {
    const map = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Sanitize folder name (allows Arabic for file system)
   */
  sanitizeFolderName(name) {
    return name
      .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 30);
  }

  /**
   * Sanitize metadata value for HTTP headers (ASCII only)
   * HTTP headers must be ASCII-only, so we transliterate or remove non-ASCII chars
   */
  sanitizeMetadataValue(value) {
    if (!value) return 'unknown';
    return value
      // Keep only ASCII alphanumeric, spaces, and safe chars
      .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII
      .replace(/[^a-zA-Z0-9\s_-]/g, '') // Keep only safe chars
      .replace(/\s+/g, '_') // Spaces to underscores
      .substring(0, 50) || 'client'; // Fallback if empty
  }

  // ─── IPC Handlers ────────────────────────────────────────────

  /**
   * Setup IPC handlers
   */
  setupIpcHandlers() {
    // Process files (dual-path: NAS + R2)
    ipcMain.handle('ingestion:processFiles', async (event, { filePaths, sessionInfo }) => {
      const sendProgress = (progress, status) => {
        event.sender.send('ingestion:progress', { progress, status });
      };
      return await this.processFiles(filePaths, sessionInfo, sendProgress);
    });

    // Process files from buffer data (for sandbox mode where file.path is unavailable)
    ipcMain.handle('ingestion:processFileBuffers', async (event, { files, sessionInfo }) => {
      const sendProgress = (progress, status) => {
        event.sender.send('ingestion:progress', { progress, status });
      };

      // Save buffers to temp files, then process normally
      const tmpDir = path.join(require('os').tmpdir(), 'villahadad-ingest');
      await fs.ensureDir(tmpDir);

      const tempPaths = [];
      for (const file of files) {
        const tmpPath = path.join(tmpDir, file.name);
        await fs.writeFile(tmpPath, Buffer.from(file.buffer));
        tempPaths.push(tmpPath);
      }

      console.log(`[IngestionService] Saved ${tempPaths.length} files to temp, processing...`);
      const result = await this.processFiles(tempPaths, sessionInfo, sendProgress);

      // Cleanup temp files
      for (const tmpPath of tempPaths) {
        try { await fs.remove(tmpPath); } catch {}
      }

      return result;
    });

    // Watch 03_EDITED folder for a session
    ipcMain.handle('ingestion:watchEdited', async (_event, { sessionPath, sessionId }) => {
      this.watchEditedFolder(sessionPath, sessionId);
      return { success: true };
    });

    // Stop watching
    ipcMain.handle('ingestion:unwatchEdited', async (_event, { sessionId }) => {
      this.unwatchEditedFolder(sessionId);
      return { success: true };
    });

    // Scan 03_EDITED for already-edited images
    ipcMain.handle('ingestion:scanEdited', async (_event, { sessionPath, sessionId }) => {
      return await this.scanEditedFolder(sessionPath, sessionId);
    });

    // Get R2 status with detailed diagnostics
    ipcMain.handle('ingestion:getR2Status', async () => {
      const keyId = (this.r2Resolved?.accessKeyId || process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID || '').trim();
      const secret = (this.r2Resolved?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY || '').trim();
      const bucket = (this.r2Bucket || this.r2Resolved?.bucket || process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME || '').trim();
      return {
        enabled: this.r2Enabled,
        bucket: bucket || null,
        publicUrl: this.r2PublicUrl || null,
        hasCredentials: !!(keyId && secret),
        lastError: this.lastR2Error,
        diagnostics: {
          awsSdkAvailable: !!S3Client,
          awsSdkLoadError: awsSdkLoadError,
          envKeyIdExists: !!keyId,
          envKeyIdLength: keyId.length,
          envSecretExists: !!secret,
          envSecretLength: secret.length,
          envBucketExists: !!bucket,
          envPublicUrlExists: !!(this.r2PublicUrl || process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL),
          keyIdPrefix: keyId ? keyId.substring(0, 8) + '...' : null,
        }
      };
    });

    // Run R2 cleanup for expired sessions (45-day post-selection)
    ipcMain.handle('ingestion:runR2Cleanup', async () => {
      return await this.runScheduledR2Cleanup();
    });

    // Manual R2 cleanup for a specific session
    ipcMain.handle('ingestion:cleanupR2Session', async (_event, { sessionId }) => {
      return await this.cleanupR2Session(sessionId);
    });

    console.log('[IngestionService] IPC handlers registered');
  }
}

module.exports = { IngestionService };
