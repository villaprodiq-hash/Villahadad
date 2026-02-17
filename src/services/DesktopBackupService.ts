/**
 * 🗄️ Desktop Backup Service
 * نظام النسخ الاحتياطي الشامل لتطبيق الماك
 * يدعم تصدير واستيراد جميع جداول SQLite
 */

import { db } from './db/index';

// All tables to backup
const BACKUP_TABLES = [
  'users',
  'bookings', 
  'payments',
  'reminders',
  'dashboard_tasks',
  'leaves',
  'activity_logs',
  'daily_attendance',
  'messages',
  'packages',
  'recurring_expenses',
  'expenses'
];

export interface BackupData {
  version: string;
  exportDate: string;
  appVersion: string;
  platform: 'desktop';
  tables: {
    [tableName: string]: Record<string, unknown>[];
  };
  metadata: {
    totalRecords: number;
    tablesCount: number;
  };
}

export interface BackupResult {
  success: boolean;
  message: string;
  filename?: string;
  recordCount?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  recordCount?: number;
  tablesFound?: string[];
}

class DesktopBackupService {
  private APP_VERSION = '1.0.0';

  private isSafeIdentifier(value: string): boolean {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
  }

  private async upsertRecord(tableName: string, record: Record<string, unknown>): Promise<boolean> {
    if (!this.isSafeIdentifier(tableName)) return false;
    const api = window.electronAPI?.db;
    if (!api) return false;

    const columns = Object.keys(record).filter(
      (column) => this.isSafeIdentifier(column)
    );
    if (columns.length === 0) return false;

    const placeholders = columns.map(() => '?').join(', ');
    const quotedColumns = columns.map((column) => `"${column}"`).join(', ');
    const sql = `INSERT OR REPLACE INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`;
    const params = columns.map((column) => record[column] ?? null);

    await api.run(sql, params);
    return true;
  }

  /**
   * تصدير نسخة احتياطية شاملة
   */
  async exportFullBackup(): Promise<BackupResult> {
    try {
      const backup: BackupData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        appVersion: this.APP_VERSION,
        platform: 'desktop',
        tables: {},
        metadata: {
          totalRecords: 0,
          tablesCount: 0
        }
      };

      // Export each table
      for (const tableName of BACKUP_TABLES) {
        try {
          const rows = await db
            .selectFrom(tableName as never)
            .selectAll()
            .execute();
          
          backup.tables[tableName] = rows;
          backup.metadata.totalRecords += rows.length;
          backup.metadata.tablesCount++;
          
          console.log(`✅ Exported ${tableName}: ${rows.length} records`);
        } catch (err) {
          // Table might not exist yet
          console.log(`⚠️ Skipped ${tableName}: ${(err as Error).message}`);
          backup.tables[tableName] = [];
        }
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `villa_hadad_desktop_backup_${timestamp}.json`;

      // Convert to JSON
      const jsonContent = JSON.stringify(backup, null, 2);

      // Use Electron's dialog to save file
      if (window.electronAPI?.saveBackupFile) {
        const saved = await window.electronAPI.saveBackupFile({
          fileName: filename,
          data: jsonContent,
          mimeType: 'application/json',
        });
        if (saved.success) {
          return {
            success: true,
            message: `تم تصدير ${backup.metadata.totalRecords} سجل بنجاح`,
            filename,
            recordCount: backup.metadata.totalRecords
          };
        }
      }

      // Fallback: Download via browser
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: `تم تصدير ${backup.metadata.totalRecords} سجل بنجاح`,
        filename,
        recordCount: backup.metadata.totalRecords
      };

    } catch (error) {
      console.error('Export Error:', error);
      return {
        success: false,
        message: `خطأ في التصدير: ${(error as Error).message}`
      };
    }
  }

  /**
   * التحقق من صحة ملف النسخة الاحتياطية
   */
  async validateBackup(file: File): Promise<ValidationResult> {
    try {
      const content = await file.text();
      const data = JSON.parse(content);

      // Check structure
      if (!data.version || !data.tables || !data.exportDate) {
        return { valid: false, error: 'هيكل الملف غير صحيح' };
      }

      // Check if it's desktop backup
      if (data.platform && data.platform !== 'desktop') {
        return { valid: false, error: 'هذا الملف ليس نسخة احتياطية لتطبيق الماك' };
      }

      const tablesFound = Object.keys(data.tables);
      let totalRecords = 0;
      
      for (const table of tablesFound) {
        if (Array.isArray(data.tables[table])) {
          totalRecords += data.tables[table].length;
        }
      }

      return {
        valid: true,
        recordCount: totalRecords,
        tablesFound
      };

    } catch (error) {
      return { valid: false, error: 'الملف تالف أو غير صالح' };
    }
  }

  /**
   * استيراد نسخة احتياطية شاملة
   */
  async importFullBackup(file: File): Promise<BackupResult> {
    try {
      // Validate first
      const validation = await this.validateBackup(file);
      if (!validation.valid) {
        return { success: false, message: validation.error || 'ملف غير صالح' };
      }

      const content = await file.text();
      const data: BackupData = JSON.parse(content);
      
      let importedCount = 0;
      const errors: string[] = [];

      // Import each table
      for (const tableName of Object.keys(data.tables)) {
        const records = data.tables[tableName];
        if (!Array.isArray(records) || records.length === 0) continue;

        try {
          for (const record of records) {
            const safeRecord = record as Record<string, unknown>;
            // Try to insert or update
            try {
              const upserted = await this.upsertRecord(tableName, safeRecord);
              if (!upserted) {
                continue;
              }
              importedCount++;
            } catch (insertErr) {
              console.warn(`Failed to import record in ${tableName}:`, safeRecord.id, insertErr);
            }
          }
          console.log(`✅ Imported ${tableName}: ${records.length} records`);
        } catch (err) {
          errors.push(`${tableName}: ${(err as Error).message}`);
          console.error(`❌ Error importing ${tableName}:`, err);
        }
      }

      if (errors.length > 0) {
        return {
          success: true,
          message: `تم استيراد ${importedCount} سجل مع بعض الأخطاء`,
          recordCount: importedCount
        };
      }

      return {
        success: true,
        message: `تم استيراد ${importedCount} سجل بنجاح`,
        recordCount: importedCount
      };

    } catch (error) {
      console.error('Import Error:', error);
      return {
        success: false,
        message: `خطأ في الاستيراد: ${(error as Error).message}`
      };
    }
  }

  /**
   * تصدير جدول واحد فقط
   */
  async exportTable(tableName: string): Promise<BackupResult> {
    try {
      const rows = await db
        .selectFrom(tableName as never)
        .selectAll()
        .execute();

      const backup = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        appVersion: this.APP_VERSION,
        platform: 'desktop',
        table: tableName,
        data: rows
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `villa_hadad_${tableName}_${timestamp}.json`;

      const jsonContent = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: `تم تصدير ${rows.length} سجل من ${tableName}`,
        filename,
        recordCount: rows.length
      };

    } catch (error) {
      return {
        success: false,
        message: `خطأ في تصدير ${tableName}: ${(error as Error).message}`
      };
    }
  }

  /**
   * مسح جميع البيانات (للاختبار فقط)
   */
  async clearAllData(): Promise<BackupResult> {
    try {
      for (const tableName of BACKUP_TABLES) {
        try {
          await db.deleteFrom(tableName as never).execute();
          console.log(`🗑️ Cleared ${tableName}`);
        } catch (err) {
          // Table might not exist
        }
      }

      return {
        success: true,
        message: 'تم مسح جميع البيانات'
      };
    } catch (error) {
      return {
        success: false,
        message: `خطأ في المسح: ${(error as Error).message}`
      };
    }
  }
}

export const desktopBackupService = new DesktopBackupService();
