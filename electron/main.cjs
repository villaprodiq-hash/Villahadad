const { app, BrowserWindow, ipcMain, dialog, systemPreferences, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

// Load environment files for R2 credentials and other config
try {
  const dotenv = require('dotenv');
  const app = require('electron').app;
  const candidatePaths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env.production'),
    path.join(__dirname, '..', '.env'),
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env.production'),
    path.join(process.cwd(), '.env'),
    path.join(app.getPath('userData'), '.env.local'),
    path.join(app.getPath('userData'), '.env.production'),
    path.join(app.getPath('userData'), '.env'),
    // Additional paths for packaged app
    path.join(app.getAppPath(), '.env.local'),
    path.join(app.getAppPath(), '.env.production'),
    path.join(app.getAppPath(), '.env'),
    path.join(app.getPath('exe'), '..', '.env.local'),
    path.join(app.getPath('exe'), '..', '.env.production'),
    path.join(app.getPath('exe'), '..', '.env'),
    path.join(app.getPath('home'), '.villahadad', '.env.local'),
    path.join(app.getPath('home'), '.villahadad', '.env.production'),
    path.join(app.getPath('home'), '.villahadad', '.env'),
  ];
  
  console.log('[Main] 🔍 Searching for environment file (.env.local / .env.production / .env)...');
  console.log('[Main]   __dirname:', __dirname);
  console.log('[Main]   process.cwd():', process.cwd());
  console.log('[Main]   userData:', app.getPath('userData'));
  console.log('[Main]   appPath:', app.getAppPath());
  console.log('[Main]   exe:', app.getPath('exe'));
  
  let loaded = false;
  let checkedPaths = [];
  
  for (const envPath of candidatePaths) {
    checkedPaths.push(envPath);
    const exists = fs.existsSync(envPath);
    console.log(`[Main]   Checking: ${envPath} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    
    if (exists) {
      // Keep existing process.env values unless missing; this allows layered config.
      const result = dotenv.config({ path: envPath, override: false });
      if (result.error) {
        console.error('[Main] dotenv error for', envPath, ':', result.error);
      } else {
        console.log('[Main] ✅ Environment loaded from:', envPath);
        const key = process.env.R2_ACCESS_KEY_ID || process.env.VITE_R2_ACCESS_KEY_ID;
        const secret = process.env.R2_SECRET_ACCESS_KEY || process.env.VITE_R2_SECRET_ACCESS_KEY;
        const bucket = process.env.R2_BUCKET_NAME || process.env.VITE_R2_BUCKET_NAME;
        const publicUrl = process.env.R2_PUBLIC_URL || process.env.VITE_R2_PUBLIC_URL;
        console.log('[Main] R2/VITE_R2_ACCESS_KEY_ID:', key ? `${String(key).trim().substring(0, 6)}... (len=${String(key).trim().length})` : '❌ MISSING');
        console.log('[Main] R2/VITE_R2_SECRET_ACCESS_KEY:', secret ? `${String(secret).trim().substring(0, 4)}... (len=${String(secret).trim().length})` : '❌ MISSING');
        console.log('[Main] R2/VITE_R2_BUCKET_NAME:', bucket || '❌ MISSING');
        console.log('[Main] R2/VITE_R2_PUBLIC_URL:', publicUrl || '❌ MISSING');
        loaded = true;
        break;
      }
    }
  }
  
  if (!loaded) {
    console.warn('[Main] ⚠️ No env file found in any known location');
    console.warn('[Main] Checked paths:', checkedPaths);
    console.warn('[Main] R2 may still work if defaults are configured in code');
  }
} catch (err) {
  console.warn('[Main] dotenv not available:', err.message);
}

const { DatabaseBridge } = require('./database-bridge.cjs');
const { SessionDirectoryManager } = require('./services/SessionDirectoryManager.cjs');
const { IngestionService } = require('./services/IngestionService.cjs');
const { LanSyncService } = require('./services/LanSyncService.cjs');
const { getInstance: getNasConfig } = require('./services/NasConfig.cjs');

// ⚡️ PERFORMANCE: Force Discrete GPU on Intel Macs (instead of integrated)
// This significantly improves rendering performance on MacBook Pro with dual GPUs
if (process.arch === 'x64' && process.platform === 'darwin') {
  app.commandLine.appendSwitch('force_high_performance_gpu');
  console.log('⚡️ GPU: Forcing High Performance (Discrete) GPU for Intel Mac');
}

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
let dbBridge;
let lanSyncService = null;

function normalizeWhatsAppPhone(rawPhone) {
  return String(rawPhone || '').replace(/\D/g, '');
}

function extractWhatsAppPayload(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return { phone: '', text: '' };

  try {
    const parsed = new URL(rawUrl);
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();

    if (protocol === 'whatsapp:') {
      return {
        phone: normalizeWhatsAppPhone(parsed.searchParams.get('phone')),
        text: parsed.searchParams.get('text') || '',
      };
    }

    if (hostname === 'wa.me') {
      return {
        phone: normalizeWhatsAppPhone(parsed.pathname.replace(/^\/+/, '')),
        text: parsed.searchParams.get('text') || '',
      };
    }

    if (
      (hostname === 'api.whatsapp.com' || hostname === 'web.whatsapp.com') &&
      parsed.pathname === '/send'
    ) {
      return {
        phone: normalizeWhatsAppPhone(parsed.searchParams.get('phone')),
        text: parsed.searchParams.get('text') || '',
      };
    }

    return { phone: '', text: '' };
  } catch {
    return { phone: '', text: '' };
  }
}

function buildWhatsAppTargets(rawUrl) {
  const { phone, text } = extractWhatsAppPayload(rawUrl);
  const params = new URLSearchParams();

  if (phone) params.set('phone', phone);
  if (text) params.set('text', text);

  const query = params.toString();
  const appUrl = query ? `whatsapp://send?${query}` : 'whatsapp://send';

  let webUrl = 'https://wa.me/';
  if (phone && text) {
    webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  } else if (phone) {
    webUrl = `https://wa.me/${phone}`;
  } else if (text) {
    webUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  return { appUrl, webUrl };
}

async function openFileInPhotoshop(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') {
    throw new Error('Missing file path');
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`File not found: ${targetPath}`);
  }

  const photoshopCandidates = new Set([
    'Adobe Photoshop 2026',
    'Adobe Photoshop 2025',
    'Adobe Photoshop 2024',
    'Adobe Photoshop 2023',
    'Adobe Photoshop 2022',
    'Adobe Photoshop',
    'Adobe Photoshop Beta',
  ]);

  const scanRoots = ['/Applications', path.join(app.getPath('home'), 'Applications')];
  for (const root of scanRoots) {
    try {
      if (!fs.existsSync(root)) continue;
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.name.toLowerCase().includes('photoshop')) continue;

        if (entry.name.endsWith('.app')) {
          photoshopCandidates.add(path.join(root, entry.name));
          continue;
        }

        if (!entry.isDirectory()) continue;
        const nestedApp = path.join(root, entry.name, `${entry.name}.app`);
        if (fs.existsSync(nestedApp)) {
          photoshopCandidates.add(nestedApp);
        }
      }
    } catch {
      // Ignore scan failures and continue with known candidates.
    }
  }

  const openWith = (args) =>
    new Promise((resolve, reject) => {
      cp.execFile('open', args, err => {
        if (err) reject(err);
        else resolve(undefined);
      });
    });

  const bundleCandidates = ['com.adobe.Photoshop', 'com.adobe.PhotoshopBeta'];
  for (const bundleId of bundleCandidates) {
    try {
      await openWith(['-b', bundleId, targetPath]);
      return { success: true, app: bundleId };
    } catch {
      // Try next bundle
    }
  }

  for (const appName of photoshopCandidates) {
    try {
      await openWith(['-a', appName, targetPath]);
      return { success: true, app: appName };
    } catch {
      // Try next candidate
    }
  }

  throw new Error('Photoshop app not found on this device');
}

function sanitizeChatFileName(fileName) {
  const baseName = String(fileName || 'attachment.bin').trim();
  const safeName = baseName
    .replace(/[^\w.\-()\u0600-\u06FF ]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
  return safeName || `attachment_${Date.now()}.bin`;
}

function coerceToBuffer(rawBuffer) {
  if (!rawBuffer) return null;

  if (Buffer.isBuffer(rawBuffer)) return rawBuffer;

  if (Array.isArray(rawBuffer)) {
    return Buffer.from(rawBuffer);
  }

  if (rawBuffer instanceof ArrayBuffer) {
    return Buffer.from(rawBuffer);
  }

  if (ArrayBuffer.isView(rawBuffer)) {
    return Buffer.from(rawBuffer.buffer, rawBuffer.byteOffset, rawBuffer.byteLength);
  }

  if (
    typeof rawBuffer === 'object' &&
    rawBuffer !== null &&
    rawBuffer.type === 'Buffer' &&
    Array.isArray(rawBuffer.data)
  ) {
    return Buffer.from(rawBuffer.data);
  }

  return null;
}

// Set database path for preload script (SQLite only)
// Set database path (Local vs Synology)
const userDataPath = app.getPath('userData');
const localDbPath = path.join(userDataPath, 'villahaddad_desktop.db');

// ✅ Initialize NAS Configuration
const nasConfig = getNasConfig();

// Get NAS base path (synchronous check)
const nasBasePath = nasConfig.getNasBasePath();
const isNasAvailable = !!nasBasePath;

// Synology Configuration (legacy support)
// Use detected NAS path or fallback to legacy path
const NAS_MOUNT_PATH = nasBasePath || '/Volumes/docker';
const NAS_DB_DIR = path.join(NAS_MOUNT_PATH, 'villahadad-api', 'database');
const nasDbPath = path.join(NAS_DB_DIR, 'villahaddad_desktop.db');

let dbPath = localDbPath;

try {
  // Check if NAS is mounted (using new NasConfig)
  if (isNasAvailable) {
    console.log('🔌 Synology NAS Detected at:', NAS_MOUNT_PATH);
    console.log('📡 SMB URL:', nasConfig.config.smbUrl);
    console.log('📁 Photo Folder:', nasConfig.getPhotoFolderPath());
    console.log('📁 App Folder:', nasConfig.getAppFolderPath());

    // Ensure NAS database folder exists
    try {
      if (!fs.existsSync(NAS_DB_DIR)) {
        fs.mkdirSync(NAS_DB_DIR, { recursive: true });
        console.log('📁 Created NAS database directory:', NAS_DB_DIR);
      }

      // Test write permission by creating a test file
      const testFile = path.join(NAS_DB_DIR, '.write_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ NAS write permission verified');

      // Migration: If DB exists locally but NOT on NAS, copy it
      if (fs.existsSync(localDbPath) && !fs.existsSync(nasDbPath)) {
        console.log('📦 Migrating Database to NAS...');
        fs.copyFileSync(localDbPath, nasDbPath);
        console.log('✅ Migration Complete');
      }

      // If NAS DB doesn't exist, create empty one (will be initialized by DatabaseBridge)
      if (!fs.existsSync(nasDbPath)) {
        console.log('📝 NAS database file does not exist, will be created on init');
      }

      dbPath = nasDbPath;
      console.log('🗄️  Using NAS Database');
    } catch (nasError) {
      console.error('⚠️ NAS access error, falling back to local database:', nasError.message);
      dbPath = localDbPath;
      console.log('🗄️  Using Local Database (NAS fallback)');
    }
  } else {
    console.log('⚠️ Synology NAS not found. Using Local Database.');
  }
} catch (e) {
  console.error('❌ Error checking NAS:', e);
  dbPath = localDbPath;
}

process.env.DB_PATH = dbPath;
console.log('📂 Final Database Path:', dbPath);

// Image Cache Setup
const cachePath = path.join(userDataPath, 'image_cache');
if (!fs.existsSync(cachePath)) {
  fs.mkdirSync(cachePath, { recursive: true });
}
console.log('🖼️ Image Cache initialized at:', cachePath);

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,                          // ✅ SECURITY FIX: Enable sandbox
      webSecurity: !isDev,                    // ✅ SECURITY FIX: Enable in production, disable only in dev
      allowRunningInsecureContent: false,     // ✅ SECURITY FIX: Block insecure content
    },
  });

  // ✅ SECURITY FIX: Add Content Security Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev 
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; img-src 'self' data: blob: https: file:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://*.villahadad.org http://localhost:* ws://localhost:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com; font-src 'self' https://fonts.gstatic.com"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https: file:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.workers.dev https://*.villahadad.org; font-src 'self' https://fonts.gstatic.com"
        ]
      }
    });
  });

  // Determine which dist folder to use (ONLY in dev mode)
  // In production (packaged), ALWAYS use 'dist'
  const folder = isDev
    ? process.env.VITE_APP_MODE === 'default'
      ? 'dist'
      : `dist-${process.env.VITE_APP_MODE}`
    : 'dist';

  if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    // Production: Always load from 'dist' folder
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.on('page-title-updated', e => e.preventDefault());
}

// ✅ SECURITY FIX: SQL Validation Helper
const ALLOWED_TABLES = ['users', 'bookings', 'payments', 'reminders', 'dashboard_tasks', 'sync_queue', 'leaves', 'activity_logs', 'daily_attendance', 'messages', 'packages', 'recurring_expenses', 'expenses'];
const DANGEROUS_PATTERNS = [
  /DROP\s+TABLE/i,
  /DROP\s+DATABASE/i,
  /TRUNCATE/i,
  /DELETE\s+FROM\s+\w+\s*$/i,  // DELETE without WHERE
  /ALTER\s+TABLE.*DROP/i,
  /EXEC\s*\(/i,
  /EXECUTE\s*\(/i,
  /xp_/i,
  /sp_/i,
  // Note: '--' pattern removed - it was blocking legitimate pragma/migration queries
  // and is already covered by parameterized queries + chained statement patterns below
  /\/\*/,         // Block comments
  /;\s*DROP/i,    // Chained DROP
  /;\s*DELETE/i,  // Chained DELETE
  /UNION\s+SELECT/i, // UNION injection
];

function validateSQL(sql) {
  if (!sql || typeof sql !== 'string') {
    console.warn('⚠️ SECURITY: Invalid SQL input - received type:', typeof sql, sql ? String(sql).substring(0, 50) : 'null/undefined');
    return { valid: false, reason: 'Invalid SQL input' };
  }
  
  const trimmedSQL = sql.trim().toUpperCase();
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sql)) {
      console.warn('⚠️ SECURITY: Blocked dangerous SQL pattern:', sql.substring(0, 100));
      return { valid: false, reason: 'Dangerous SQL pattern detected' };
    }
  }
  
  // Log queries in dev mode for debugging
  if (isDev) {
    console.log('📝 SQL Query:', sql.substring(0, 200));
  }
  
  return { valid: true };
}

// IPC Handlers for Database Operations
function setupIPCHandlers() {
  // Query handler with SQL validation
  ipcMain.handle('db:query', async (event, sql, params) => {
    try {
      // ✅ SECURITY FIX: Validate SQL before execution
      const validation = validateSQL(sql);
      if (!validation.valid) {
        console.error('❌ SQL Validation Failed:', validation.reason);
        return { success: false, error: validation.reason };
      }
      
      return await dbBridge.query(sql, params || []);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ✅ FIX: Add Missing 'db:run' handler for INSERT/UPDATE/DELETE
  ipcMain.handle('db:run', async (event, sql, params) => {
    try {
      const validation = validateSQL(sql);
      if (!validation.valid) {
          return { success: false, error: validation.reason };
      }
      
      // Handle PRAGMA statements directly (better-sqlite3 uses .pragma() method)
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('PRAGMA') && dbBridge.sqliteDb) {
        try {
          // Extract pragma command (e.g., "foreign_keys = OFF" from "PRAGMA foreign_keys = OFF")
          const pragmaCmd = sql.trim().replace(/^PRAGMA\s+/i, '');
          dbBridge.sqliteDb.pragma(pragmaCmd);
          return { success: true, rows: [], source: 'sqlite' };
        } catch (pragmaError) {
          console.error('PRAGMA execution failed:', pragmaError);
          return { success: false, error: pragmaError.message };
        }
      }
      
      // dbBridge.query handles both SELECT (returns rows) and others (returns info)
      const result = await dbBridge.query(sql, params || []);
      return result; 
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Connection status
  ipcMain.handle('db:status', async () => {
    return dbBridge.getStatus();
  });

  ipcMain.handle('lan:publish', async (_event, payload) => {
    try {
      if (!lanSyncService) {
        return { success: false, error: 'LAN sync not initialized' };
      }

      const channel =
        payload && typeof payload === 'object' && typeof payload.channel === 'string'
          ? payload.channel
          : '';
      const body =
        payload && typeof payload === 'object' && 'payload' in payload
          ? payload.payload
          : null;

      if (!channel) {
        return { success: false, error: 'Missing LAN channel' };
      }

      const published = lanSyncService.publish(channel, body);
      if (!published) {
        return { success: false, error: 'Failed to publish LAN event' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || String(error) };
    }
  });

  console.log('✅ IPC Database Handlers registered');

  // --- Image Caching Handlers ---

  // Check if file is cached
  ipcMain.handle('file:check-cache', async (event, sourcePath) => {
    try {
      if (!sourcePath) return null;
      const hash = crypto.createHash('md5').update(sourcePath).digest('hex');
      const ext = path.extname(sourcePath) || '.jpg';
      const cachedFile = path.join(cachePath, `${hash}${ext}`);

      if (fs.existsSync(cachedFile)) {
        return `file://${cachedFile}`;
      }
      return null;
    } catch (e) {
      console.error('Cache Check Error:', e);
      return null;
    }
  });

  // Download/Copy to Cache
  ipcMain.handle('file:cache-image', async (event, sourcePath) => {
    try {
      if (!sourcePath) return null;
      const hash = crypto.createHash('md5').update(sourcePath).digest('hex');
      const ext = path.extname(sourcePath) || '.jpg';
      const cachedFile = path.join(cachePath, `${hash}${ext}`);

      // If already exists, return it
      if (fs.existsSync(cachedFile)) {
        return `file://${cachedFile}`;
      }

      // If it's a web URL (http/https), we might need to download it (Optional enhancement for mock data)
      // But for Synology (network path), we just copy.
      // Handling HTTP URLs for compatibility with Mock Data (Unsplash)
      if (sourcePath.startsWith('http')) {
        const response = await fetch(sourcePath);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(cachedFile, buffer);
        return `file://${cachedFile}`;
      }

      // Assume Local/Network Path
      fs.copyFileSync(sourcePath, cachedFile);
      return `file://${cachedFile}`;
    } catch (e) {
      console.error('Cache Error:', e);
      throw e;
    }
  });

  // Batch Download/Cache
  ipcMain.handle('file:cache-multiple-images', async (event, sourcePaths) => {
    try {
      if (!Array.isArray(sourcePaths)) return [];
      const results = [];
      for (const sourcePath of sourcePaths) {
        if (!sourcePath) continue;
        try {
          const hash = crypto.createHash('md5').update(sourcePath).digest('hex');
          const ext = path.extname(sourcePath) || '.jpg';
          const cachedFile = path.join(cachePath, `${hash}${ext}`);

          if (fs.existsSync(cachedFile)) {
            results.push(`file://${cachedFile}`);
            continue;
          }

          if (sourcePath.startsWith('http')) {
            const response = await fetch(sourcePath);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(cachedFile, buffer);
            results.push(`file://${cachedFile}`);
          } else {
            fs.copyFileSync(sourcePath, cachedFile);
            results.push(`file://${cachedFile}`);
          }
        } catch (innerErr) {
          console.error(`Failed to cache ${sourcePath}:`, innerErr);
          // Push original on failure so UI still shows something (or null)
          results.push(sourcePath);
        }
      }
      return results;
    } catch (e) {
      console.error('Batch Cache Error:', e);
      return sourcePaths;
    }
  });

  // 🛡️ SAFE IMPORT (External Media -> System)
  // Implements strict Copy+Verify logic. Source is NEVER modified.
  ipcMain.handle('file:safe-import', async (event, sourcePath, destFolder) => {
    try {
      if (!sourcePath || !destFolder) throw new Error('Missing paths');

      // 1. Calculate Source Hash
      const getHash = p =>
        new Promise((resolve, reject) => {
          const hash = crypto.createHash('md5');
          const stream = fs.createReadStream(p);
          stream.on('error', reject);
          stream.on('data', c => hash.update(c));
          stream.on('end', () => resolve(hash.digest('hex')));
        });

      console.log(`🛡️ Importing: ${sourcePath}`);
      const sourceHash = await getHash(sourcePath);

      // 2. Copy File
      const fileName = path.basename(sourcePath);
      const destPath = path.join(destFolder, fileName);

      // Ensure dest folder exists
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      fs.copyFileSync(sourcePath, destPath);

      // 3. Verify Destination Hash
      const destHash = await getHash(destPath);

      if (sourceHash !== destHash) {
        // Integrity Failure: Delete corrupt copy
        fs.unlinkSync(destPath);
        throw new Error('CHECKSUM_MISMATCH');
      }

      console.log(`✅ Verified Import: ${destPath}`);
      return { success: true, path: destPath, verified: true };
    } catch (e) {
      console.error('Safe Import Failed:', e);
      return { success: false, error: e.message };
    }
  });

  // Chat attachment storage (shared filesystem/NAS first, local cache fallback)
  ipcMain.handle('chat:store-attachment', async (_event, payload = {}) => {
    try {
      const fileName = sanitizeChatFileName(payload?.fileName);
      const mimeType =
        typeof payload?.mimeType === 'string' && payload.mimeType.trim()
          ? payload.mimeType
          : 'application/octet-stream';
      const sourcePath =
        typeof payload?.sourcePath === 'string' && payload.sourcePath.trim()
          ? payload.sourcePath
          : null;
      const binaryBuffer = coerceToBuffer(payload?.buffer);

      if (!sourcePath && !binaryBuffer) {
        return { success: false, error: 'Missing sourcePath or buffer' };
      }

      const now = new Date();
      const year = String(now.getFullYear());
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const rootPath = getNasConfig().getAppFolderPath();
      const chatFolder = path.join(rootPath, '_chat_attachments', year, month, day);
      await fs.promises.mkdir(chatFolder, { recursive: true });

      const finalName = `${Date.now()}_${fileName}`;
      const targetPath = path.join(chatFolder, finalName);

      if (sourcePath) {
        if (!fs.existsSync(sourcePath)) {
          return { success: false, error: 'Source file not found' };
        }
        await fs.promises.copyFile(sourcePath, targetPath);
      } else if (binaryBuffer) {
        await fs.promises.writeFile(targetPath, binaryBuffer);
      }

      const stats = await fs.promises.stat(targetPath);

      return {
        success: true,
        path: targetPath,
        fileUrl: pathToFileURL(targetPath).toString(),
        fileName: finalName,
        mimeType,
        size: stats.size
      };
    } catch (error) {
      console.error('[chat:store-attachment] failed:', error);
      return { success: false, error: error?.message || String(error) };
    }
  });

  // Clear Cache
  ipcMain.handle('file:clear-cache', async () => {
    try {
      if (!fs.existsSync(cachePath)) return true;
      const files = fs.readdirSync(cachePath);
      for (const file of files) {
        fs.unlinkSync(path.join(cachePath, file));
      }
      return true;
    } catch (e) {
      console.error('Clear Cache Error:', e);
      return false;
    }
  });

  // Open Directory Dialog
  ipcMain.handle('file:open-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // Open a specific file/folder path in OS shell
  ipcMain.handle('file:open-path', async (_event, targetPath) => {
    try {
      if (!targetPath || typeof targetPath !== 'string') {
        return { success: false, error: 'Missing path' };
      }

      const errorMessage = await shell.openPath(targetPath);
      if (errorMessage) {
        return { success: false, error: errorMessage };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || String(error) };
    }
  });

  ipcMain.handle('file:show-in-folder', async (_event, targetPath) => {
    try {
      if (!targetPath || typeof targetPath !== 'string') {
        return { success: false, error: 'Missing path' };
      }

      if (!fs.existsSync(targetPath)) {
        return { success: false, error: 'Path not found' };
      }

      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        const openError = await shell.openPath(targetPath);
        if (openError) {
          return { success: false, error: openError };
        }
        return { success: true };
      }

      shell.showItemInFolder(targetPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error?.message || String(error) };
    }
  });

  // Open a file directly in Photoshop (with fallback to default app)
  ipcMain.handle('file:open-in-photoshop', async (_event, targetPath) => {
    try {
      return await openFileInPhotoshop(targetPath);
    } catch (error) {
      return { success: false, error: error?.message || String(error) };
    }
  });

  // List Directory Contents
  ipcMain.handle('file:list-directory', async (event, dirPath) => {
    try {
      if (!fs.existsSync(dirPath)) return [];
      const items = fs.readdirSync(dirPath, { withFileTypes: true });

      return items.map(item => {
        const fullPath = path.join(dirPath, item.name);
        const stats = fs.statSync(fullPath);
        return {
          name: item.name,
          path: fullPath,
          isDirectory: item.isDirectory(),
          size: stats.size,
          mtime: stats.mtimeMs,
          btime: stats.birthtimeMs,
        };
      });
    } catch (e) {
      console.error('List Directory Error:', e);
      return [];
    }
  });

  // 📡 NAS Connection Status (Updated with NasConfig)
  ipcMain.handle('nas:check-status', async () => {
    try {
      const nasConfig = getNasConfig();
      const status = await nasConfig.checkNasAvailability();
      
      // Get additional paths info
      const potentialPaths = [
        '/Volumes/VillaHadad/Gallery',
        '/Volumes/VillaHadad',
        '/Volumes/Gallery',
        '/Volumes/public',
        '/Volumes/photo',
        '/Volumes/video',
        '/Volumes/Synology',
        '/Volumes/shared',
      ];
      
      const foundPaths = potentialPaths.filter(p => fs.existsSync(p));
      
      return {
        ...status,
        foundPaths,
        config: {
          smbUrl: nasConfig.config.smbUrl,
          macosMountPath: nasConfig.config.macosMountPath,
          localCachePath: nasConfig.config.localCachePath,
        }
      };
    } catch (e) {
      console.error('NAS Check Error:', e);
      return { connected: false, error: e.message };
    }
  });

  // 🔧 NAS Configuration APIs
  ipcMain.handle('nas:get-config', async () => {
    const nasConfig = getNasConfig();
    return {
      smbUrl: nasConfig.config.smbUrl,
      macosMountPath: nasConfig.config.macosMountPath,
      appSubfolder: nasConfig.config.appSubfolder,
      appFolderPath: nasConfig.getAppFolderPath(),
      nasRootPath: nasConfig.getNasBasePath(),
      currentPath: nasConfig.getAppFolderPath(), // This is what the app uses
      isLocalCache: nasConfig.isUsingLocalCache(),
      platform: process.platform,
      restrictToAppFolder: nasConfig.config.restrictToAppFolder,
    };
  });

  ipcMain.handle('nas:set-smb-url', async (_event, { url }) => {
    const nasConfig = getNasConfig();
    nasConfig.setSmbUrl(url);
    return { success: true, url };
  });

  ipcMain.handle('nas:set-app-subfolder', async (_event, { subfolder }) => {
    const nasConfig = getNasConfig();
    nasConfig.config.appSubfolder = subfolder;
    nasConfig.saveConfig();
    // Re-initialize with new subfolder
    await nasConfig.initializeAppFolder();
    return { 
      success: true, 
      subfolder,
      appFolderPath: nasConfig.getAppFolderPath()
    };
  });

  ipcMain.handle('nas:initialize-app-folder', async () => {
    const nasConfig = getNasConfig();
    return await nasConfig.initializeAppFolder();
  });

  ipcMain.handle('nas:open-folder', async (_event, { subPath = '' }) => {
    const nasConfig = getNasConfig();
    return await nasConfig.openNasFolder(subPath);
  });

  ipcMain.handle('nas:open-app-folder', async () => {
    const { shell } = require('electron');
    const nasConfig = getNasConfig();
    const appFolder = nasConfig.getAppFolderPath();
    shell.openPath(appFolder);
    return { success: true, path: appFolder };
  });

  // 🔌 NEW: Mount/Connect to NAS
  ipcMain.handle('nas:mount', async () => {
    try {
      const nasConfig = getNasConfig();
      return await nasConfig.mountNas();
    } catch (error) {
      console.error('[IPC] mountNas error:', error);
      return { success: false, error: error.message };
    }
  });

  // 🔍 NEW: Detect NAS automatically
  ipcMain.handle('nas:detect', async () => {
    try {
      const nasConfig = getNasConfig();
      return await nasConfig.detectNas();
    } catch (error) {
      console.error('[IPC] detectNas error:', error);
      return { found: false, error: error.message, attempts: [] };
    }
  });

  // 💾 Disk Stats (For Gallery Sidebar)
  ipcMain.handle('file:get-disk-stats', async () => {
    return new Promise(resolve => {
      // macOS/Linux: df -k
      cp.exec('df -k /', (error, stdout, stderr) => {
        if (error) {
          console.error('Disk Stats Error:', error);
          resolve({ used: 0, total: 0, free: 0 }); // Fallback
          return;
        }

        // Output format (approx):
        // Filesystem 1024-blocks Used Available Capacity iused ifree %iused  Mounted on
        // /dev/disk3s1s1 976490572 15234568 456789124 ...

        try {
          const lines = stdout.trim().split('\n');
          if (lines.length < 2) {
            resolve({ used: 0, total: 0 });
            return;
          }

          const parts = lines[1].replace(/\s+/g, ' ').split(' ');
          // parts[1] is total (1k blocks)
          // parts[2] is used
          // parts[3] is available (sometimes)

          const totalBytes = parseInt(parts[1]) * 1024;
          const usedBytes = parseInt(parts[2]) * 1024;
          const freeBytes = parseInt(parts[3]) * 1024;

          // Convert to GB for frontend
          const totalGB = Math.round(totalBytes / (1024 * 1024 * 1024));
          const usedGB = Math.round(usedBytes / (1024 * 1024 * 1024));

          resolve({
            used: usedGB,
            total: totalGB,
            free: Math.round(freeBytes / (1024 * 1024 * 1024)),
            percent: Math.round((usedGB / totalGB) * 100),
          });
        } catch (e) {
          console.error('Parse Disk Stats Error:', e);
          resolve({ used: 0, total: 0, error: true });
        }
      });
    });
  });

  // 🔐 Biometric Auth (Touch ID)
  ipcMain.handle('auth:check-biometric', async () => {
    try {
      if (process.platform !== 'darwin') return false;
      // Check if device supports Touch ID
      return systemPreferences.canPromptTouchID();
    } catch (e) {
      console.error('Biometric Check Failed:', e);
      return false;
    }
  });

  ipcMain.handle('auth:prompt-touch-id', async (event, reason) => {
    try {
      if (process.platform !== 'darwin') throw new Error('Not local macOS');

      // This prompts the native macOS dialog
      await systemPreferences.promptTouchID(reason || 'Authenticate to access Villa Haddad');
      return true; // Success
    } catch (e) {
      console.warn('Touch ID Failed/Cancelled:', e.message);
      return false; // Failed
    }
  });

  // Window always-on-top mode for "Task Pop"
  ipcMain.handle('window:set-always-on-top', async (event, { enabled }) => {
    try {
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      if (!senderWindow) {
        return { success: false, error: 'Window not found', enabled: false };
      }

      const shouldEnable = Boolean(enabled);
      senderWindow.setAlwaysOnTop(shouldEnable, 'floating');
      if (shouldEnable) {
        senderWindow.moveTop();
      }

      return { success: true, enabled: senderWindow.isAlwaysOnTop() };
    } catch (error) {
      return {
        success: false,
        error: error?.message || String(error),
        enabled: false,
      };
    }
  });

  // 📱 WhatsApp Integration Handler
  ipcMain.handle('whatsapp:open', async (_event, url) => {
    try {
      const { appUrl, webUrl } = buildWhatsAppTargets(url);
      let mode = 'app';

      try {
        await shell.openExternal(appUrl);
      } catch (appError) {
        mode = 'web';
        console.warn('[whatsapp:open] App protocol failed. Falling back to web:', appError?.message || appError);
        await shell.openExternal(webUrl);
      }

      return { success: true, mode, url: mode === 'app' ? appUrl : webUrl };
    } catch (error) {
      console.error('[whatsapp:open] Failed to open WhatsApp:', error);
      return { success: false, error: error?.message || String(error) };
    }
  });

  // 📦 BACKUP HANDLERS
  ipcMain.handle('backup:save-file', async (event, filename, content) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });
      
      if (result.canceled || !result.filePath) {
        return false;
      }
      
      fs.writeFileSync(result.filePath, content, 'utf8');
      console.log('✅ Backup saved to:', result.filePath);
      return true;
    } catch (err) {
      console.error('❌ Backup save error:', err);
      return false;
    }
  });

  ipcMain.handle('backup:open-file', async () => {
    try {
      const result = await dialog.showOpenDialog({
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
      });
      
      if (result.canceled || !result.filePaths[0]) {
        return null;
      }
      
      const content = fs.readFileSync(result.filePaths[0], 'utf8');
      return content;
    } catch (err) {
      console.error('❌ Backup open error:', err);
      return null;
    }
  });

  // 🔄 AUTO UPDATER LOGIC
  // ✅ SECURITY: Inject Auth Header for Private Repo Access
  // NOTE: In a perfect world, use a Read-Only Token or Public Repo.
  // For now, using the provided token to unblock the user.
  // Use environment token at runtime to avoid committing secrets into git history.
  autoUpdater.requestHeaders = process.env.GH_TOKEN
    ? { Authorization: `token ${process.env.GH_TOKEN}` }
    : {};

  ipcMain.handle('app:restart-install', () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle('app:check-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo?.version };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // ✅ HANDLER: Manual Download Trigger
  ipcMain.handle('app:download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('app:get-version', () => {
    return {
      version: app.getVersion(),
      name: app.getName()
    };
  });

  // ⚡️ System Info Handler (for Performance Mode detection)
  ipcMain.handle('system:get-info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version
    };
  });

  // 🔍 AUTO-UPDATER LOGGING
  console.log('🔄 AutoUpdater: Setting up event listeners...');
  console.log('🔄 AutoUpdater: isDev =', isDev);
  console.log('🔄 AutoUpdater: app.isPackaged =', app.isPackaged);

  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 AutoUpdater: Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('✅ AutoUpdater: Update AVAILABLE!', info);
    BrowserWindow.getAllWindows().forEach(win =>
      win.webContents.send('update_status', { status: 'available', version: info?.version })
    );
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('ℹ️ AutoUpdater: No update available. Current version is latest.', info);
    // ✅ SILENCED: Do not broadcast to UI on startup check
    // BrowserWindow.getAllWindows().forEach(win =>
    //   win.webContents.send('update_status', { status: 'not-available', version: info?.version })
    // );
  });

  autoUpdater.on('download-progress', progressObj => {
    console.log('📥 AutoUpdater: Download progress:', Math.round(progressObj.percent) + '%');
    BrowserWindow.getAllWindows().forEach(win =>
      win.webContents.send('update_status', {
        status: 'downloading',
        progress: progressObj.percent,
      })
    );
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ AutoUpdater: Update DOWNLOADED!', info);
    BrowserWindow.getAllWindows().forEach(win =>
      win.webContents.send('update_status', { status: 'ready', version: info?.version })
    );
  });

  // ❌ Disable silent install on quit - User must click "Restart"
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoDownload = false; // ✅ USER REQUEST: Manual download only

  autoUpdater.on('error', err => {
    console.error('❌ AutoUpdater Error:', err);
    BrowserWindow.getAllWindows().forEach(win =>
      win.webContents.send('update_status', { status: 'error', error: err.message })
    );
  });

  // Check for updates periodically
  if (!isDev) {
    console.log('🚀 AutoUpdater: Production mode - enabling auto-update checks');

    // ✅ USER REQUEST: Check ONLY on startup, disable periodic checks
    // setInterval(
    //   () => {
    //     console.log('🔄 AutoUpdater: Hourly check...');
    //     autoUpdater.checkForUpdates().catch(err => {
    //       console.error('❌ AutoUpdater hourly check failed:', err);
    //     });
    //   },
    //   1000 * 60 * 60
    // ); // Check every hour

    // Check on startup (after 5 seconds)
    setTimeout(() => {
      console.log('🚀 AutoUpdater: Initial startup check...');
      autoUpdater.checkForUpdates().catch(err => {
        console.error('❌ AutoUpdater startup check failed:', err);
      });
    }, 5000);
  } else {
    console.log('⚠️ AutoUpdater: Development mode - auto-updates DISABLED');
  }
}

// Session Management Services (initialized in app.whenReady)
let sessionDirectoryManager;
let ingestionService;

app.whenReady().then(async () => {
  console.log('[Main] 🚀 App is ready, initializing...');

  lanSyncService = new LanSyncService();
  lanSyncService.start((packet) => {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (win && !win.isDestroyed()) {
        win.webContents.send('lan:sync-event', packet);
      }
    }
  });
  
  // Initialize DatabaseBridge
  console.log('[Main] 📦 Initializing DatabaseBridge...');
  dbBridge = new DatabaseBridge(app);
  
  // Wait for database initialization with timeout
  console.log('[Main] ⏳ Waiting for database initialization...');
  const maxWaitTime = 10000; // 10 seconds max
  const checkInterval = 100;
  let waited = 0;
  
  while (!dbBridge.sqliteDb && waited < maxWaitTime) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    waited += checkInterval;
  }
  
  if (dbBridge.sqliteDb) {
    console.log(`[Main] ✅ Database initialized after ${waited}ms`);
  } else {
    console.error('[Main] ❌ Database failed to initialize within timeout');
    console.error('[Main]   Error:', dbBridge.initError || 'Unknown error');
  }

  // 🔌 Auto-mount NAS on startup
  console.log('[Main] 🔌 Attempting to auto-mount NAS...');
  try {
    const nasMountResult = await nasConfig.autoMountOnStartup();
    if (nasMountResult.success) {
      console.log('[Main] ✅ NAS auto-mounted:', nasMountResult.path, `(${nasMountResult.method})`);
    } else {
      console.log('[Main] ⚠️ NAS auto-mount failed:', nasMountResult.error);
      console.log('[Main]   Will use local cache or require manual connection');
    }
  } catch (error) {
    console.error('[Main] ❌ NAS auto-mount error:', error.message);
  }

  // Initialize Session Management Services
  console.log('[Main] 📦 Initializing Session Directory Manager...');
  sessionDirectoryManager = new SessionDirectoryManager();
  sessionDirectoryManager.setupIpcHandlers();
  console.log('[Main] ✅ Session Directory Manager ready');

  console.log('[Main] 📦 Initializing Ingestion Service...');
  ingestionService = new IngestionService();
  ingestionService.setDbBridge(dbBridge);
  ingestionService.setupIpcHandlers();
  console.log('[Main] ✅ Ingestion Service ready (R2:', ingestionService.r2Enabled ? 'ON' : 'OFF', ')');

  // R2 cleanup: run once on startup, then every 6 hours
  if (ingestionService.r2Enabled) {
    setTimeout(() => {
      ingestionService.runScheduledR2Cleanup().then(r => {
        if (r.cleaned > 0) console.log(`[Main] 🗑️ R2 startup cleanup: ${r.cleaned} sessions cleaned`);
      }).catch(() => {});
    }, 10000); // 10s delay after startup

    setInterval(() => {
      ingestionService.runScheduledR2Cleanup().catch(() => {});
    }, 6 * 60 * 60 * 1000); // every 6 hours
  }

  // Setup IPC handlers
  console.log('[Main] 🔌 Setting up IPC handlers...');
  setupIPCHandlers();
  console.log('[Main] ✅ IPC handlers ready');

  // Now create window (after DB is ready)
  console.log('[Main] 🪟 Creating main window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  try {
    lanSyncService?.stop();
  } catch (error) {
    console.error('[Main] Failed to stop LAN sync service:', error?.message || error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
