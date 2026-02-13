const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseBridge {
  constructor(app) {
    this.app = app;
    this.pgPool = null;
    this.sqliteDb = null;
    this.isOnline = false;
    this.dbPath = null;

    this.initError = null;

    this.initializeDatabases();
  }

  async initializeDatabases() {
    console.log('[DatabaseBridge] 🔄 Starting database initialization...');
    
    // 1. SQLite Local DB (Acting as primary for offline/desktop mode)
    const localDbPath = path.join(this.app.getPath('userData'), 'villahaddad_desktop.db');
    let dbPath = process.env.DB_PATH || localDbPath;
    
    console.log(`[DatabaseBridge] 📂 Target database path: ${dbPath}`);
    console.log(`[DatabaseBridge] 📂 Fallback local path: ${localDbPath}`);

    // Try primary path first, fall back to local if it fails
    const tryInitialize = (tryPath, isRetry = false) => {
      try {
        console.log(`[DatabaseBridge] 🔄 Attempting to open database at: ${tryPath}`);

        // Ensure parent directory exists
        const parentDir = path.dirname(tryPath);
        if (!fs.existsSync(parentDir)) {
          console.log(`[DatabaseBridge] 📁 Creating database directory: ${parentDir}`);
          fs.mkdirSync(parentDir, { recursive: true });
          console.log('[DatabaseBridge] ✅ Created database directory');
        }

        console.log('[DatabaseBridge] 📦 Opening SQLite database...');
        this.sqliteDb = new Database(tryPath);
        this.dbPath = tryPath;

        // ⚠️ WAL mode breaks on Network Shares (SMB/NFS) due to mmap issues.
        // Only enable WAL if we are NOT on a network volume (macOS /Volumes/...)
        if (!tryPath.startsWith('/Volumes')) {
          this.sqliteDb.pragma('journal_mode = WAL');
          console.log('[DatabaseBridge] 🚀 WAL Mode Enabled (Local DB)');
        } else {
          this.sqliteDb.pragma('journal_mode = DELETE');
          console.log('[DatabaseBridge] 🐢 Network DB Detected: WAL Disabled (Using DELETE mode)');
        }

        console.log(`[DatabaseBridge] ✅ SQLite Database initialized successfully at: ${tryPath}`);
        return true;
      } catch (error) {
        console.error(`[DatabaseBridge] ❌ SQLite initialization failed for ${tryPath}:`, error.message);
        console.error(`[DatabaseBridge]    Error details:`, error);

        // If this was a NAS path and failed, try local path
        if (!isRetry && tryPath !== localDbPath) {
          console.log('[DatabaseBridge] ⚠️ Falling back to local database...');
          return tryInitialize(localDbPath, true);
        }

        this.initError = error.message;
        console.error('[DatabaseBridge] ❌ All database initialization attempts failed');
        return false;
      }
    };

    const success = tryInitialize(dbPath);
    console.log(`[DatabaseBridge] 🏁 Database initialization ${success ? 'SUCCEEDED' : 'FAILED'}`);
    return success;
  }

  startHealthCheck() {
    // No-op for now as we are strictly offline/local
  }

  async query(sql, params = []) {
    // Always use SQLite for now (Offline Mode)
    if (this.sqliteDb) {
      try {
        // Log query for debugging
        console.log('SQL:', sql);
        console.log('Params:', params);

        const stmt = this.sqliteDb.prepare(sql);
        
        // Handle SELECT and PRAGMA (read-only that returns rows)
        const cmd = sql.trim().toUpperCase();
        if (cmd.startsWith('SELECT') || cmd.startsWith('PRAGMA')) {
           const rows = stmt.all(...params);
           return { success: true, rows, source: 'sqlite' };
        } else {
           const info = stmt.run(...params);
           const safeInfo = {
             changes: info.changes,
             lastInsertRowid: info.lastInsertRowid ? info.lastInsertRowid.toString() : '0'
           };
           return { success: true, rows: [], info: safeInfo, source: 'sqlite' };
        }
      } catch (error) {
        console.error('SQLite query failed:', error);
        console.error('Failed Params:', params);
        return { success: false, error: error.message };
      }
    }

    return { 
      success: false, 
      error: `Database not initialized. Error: ${this.initError || 'Unknown error'}`,
      source: 'none'
    };
  }

  getStatus() {
    return {
      postgres: false,
      cache: !!this.sqliteDb,
    };
  }
}

module.exports = { DatabaseBridge };
