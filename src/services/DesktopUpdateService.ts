/**
 * 🔄 Desktop Update Service
 * نظام التحديثات التلقائية لتطبيق الماك
 * يستخدم electron-updater
 */

export const APP_VERSION = '1.0.0';
export const BUILD_NUMBER = 1;

export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error';
  progress?: number;
  error?: string;
  version?: string;
}

class DesktopUpdateService {
  private listeners: ((status: UpdateStatus) => void)[] = [];

  constructor() {
    // Listen for update events from main process
    if (window.electronAPI?.onUpdateStatus) {
      window.electronAPI.onUpdateStatus((status: UpdateStatus) => {
        this.notifyListeners(status);
      });
    }
  }

  /**
   * الحصول على معلومات الإصدار الحالي
   */
  getVersionInfo() {
    return {
      version: APP_VERSION,
      buildNumber: BUILD_NUMBER,
      displayVersion: `v${APP_VERSION} (Build ${BUILD_NUMBER})`
    };
  }

  /**
   * التحقق من وجود تحديثات
   */
  async checkForUpdates(): Promise<void> {
    if (window.electronAPI?.checkForUpdates) {
      await window.electronAPI.checkForUpdates();
    }
  }

  /**
   * تثبيت التحديث وإعادة التشغيل
   */
  async installUpdate(): Promise<void> {
    if (window.electronAPI?.installUpdate) {
      await window.electronAPI.installUpdate();
    }
  }

  /**
   * بدء التحميل يدوياً
   */
  async downloadUpdate(): Promise<void> {
    if (window.electronAPI?.downloadUpdate) {
      await window.electronAPI.downloadUpdate();
    }
  }

  /**
   * الاشتراك في أحداث التحديث
   */
  onUpdateStatus(callback: (status: UpdateStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(status: UpdateStatus) {
    this.listeners.forEach(l => l(status));
  }
}

export const desktopUpdateService = new DesktopUpdateService();

// Extend window type for TypeScript
declare global {
  interface Window {
    electronAPI?: {
      onUpdateStatus?: (callback: (status: UpdateStatus) => void) => void;
      checkForUpdates?: () => Promise<void>;
      installUpdate?: () => Promise<void>;
      downloadUpdate?: () => Promise<void>;
      saveBackupFile?: (filename: string, content: string) => Promise<boolean>;
    };
  }
}
