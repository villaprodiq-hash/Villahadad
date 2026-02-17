import { toast } from 'sonner';
import { supabase } from '../supabase';
import { OFFLINE_PING_INTERVAL_MS, MAX_SYNC_RETRIES } from '../../constants/appConstants';

interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  data?: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
}

type OfflineEvent = 'status_change' | 'sync_start' | 'sync_complete' | 'sync_error' | 'server_down';
type Listener = (event: OfflineEvent, data?: unknown) => void;

class OfflineManagerService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private syncQueue: SyncQueueItem[] = [];
  private listeners: Listener[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private serverUrl: string = 'http://localhost:3000';
  private onlineHandler: (() => void) | null = null;
  private offlineHandler: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (typeof localStorage !== 'undefined') {
      const savedQueue = localStorage.getItem('offline_sync_queue');
      if (savedQueue) {
        try {
          this.syncQueue = JSON.parse(savedQueue);
        } catch {
          this.syncQueue = [];
        }
      }
    }

    if (typeof window !== 'undefined') {
      this.onlineHandler = () => this.handleConnectionChange(true);
      this.offlineHandler = () => this.handleConnectionChange(false);
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
    }

    this.startPing();
  }

  private startPing() {
    this.checkConnection();

    this.pingInterval = setInterval(() => {
      this.checkConnection();
    }, OFFLINE_PING_INTERVAL_MS);
  }

  /**
   * Cleanup all listeners and intervals to prevent memory leaks
   */
  public destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (typeof window !== 'undefined') {
      if (this.onlineHandler) window.removeEventListener('online', this.onlineHandler);
      if (this.offlineHandler) window.removeEventListener('offline', this.offlineHandler);
    }
    this.listeners = [];
  }

  private async checkConnection() {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (this.isOnline) this.handleConnectionChange(false);
        return;
      }

      // Check Real NAS Status via Electron IPC (File System Check)
      // This is much more accurate than pinging localhost
      if (
        typeof window !== 'undefined' &&
        window.electronAPI?.fileSystem?.checkNasStatus
      ) {
        const nasStatus = await window.electronAPI.fileSystem.checkNasStatus();

        if (nasStatus && nasStatus.connected) {
          if (!this.isOnline) this.handleConnectionChange(true);
        } else {
          // Internet OK, NAS Unreachable (or unmounted)
          this.notifyListeners('server_down');
        }
      }
    } catch (_error) {
      if (this.isOnline) this.handleConnectionChange(false);
    }
  }

  private handleConnectionChange(online: boolean) {
    this.isOnline = online;
    this.notifyListeners('status_change', { online });

    if (online) {
      toast.success('تم استعادة الاتصال بالسيرفر 🟢');
      this.processSyncQueue();
    } else {
      toast.error('انقطع الاتصال - وضع العمل دون اتصال 🔴');
    }
  }

  // --- Queue Management ---

  public addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>) {
    const newItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(newItem);
    this.saveQueue();

    // UI Feedback
    toast.info('تم حفظ العملية محلياً (في انتظار الاتصال)');
  }

  private saveQueue() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('offline_sync_queue', JSON.stringify(this.syncQueue));
    }
  }

  private async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    this.notifyListeners('sync_start');

    // Clone queue to process
    const queueToProcess = [...this.syncQueue];
    const failedItems: SyncQueueItem[] = [];

    for (const item of queueToProcess) {
      try {
        await this.syncItem(item);
      } catch (e) {
        console.error('Sync failed for item', item.id, e);
        item.retryCount++;
        if (item.retryCount < MAX_SYNC_RETRIES) {
          failedItems.push(item);
        } else {
          // Move to conflict/error log
          toast.error(`فشل مزامنة عنصر نهائياً: ${item.action} ${item.entity}`);
        }
      }
    }

    // Update Queue
    this.syncQueue = failedItems;
    this.saveQueue();

    if (failedItems.length === 0) {
      this.notifyListeners('sync_complete');
      toast.success('تم مزامنة جميع البيانات المعلقة ✅');
    } else {
      this.notifyListeners('sync_error');
    }
  }

  private async syncItem(item: SyncQueueItem) {
    if (!item.data) return;

    // Dynamically import supabase to avoid circular usage issues if possible,
    // or assume it's available globally/imported.
    // Since we can't easily dynamic import in this environment without risks,
    // we should rely on the `supabase` client.
    // BUT `OfflineManager` might not have imported it.
    // I will check imports. If not present, I need to add it.

    // Check if supabase is imported (it wasn't in the view).
    // I will assume I need to handle this.
    // For now, I'll use the window.electronAPI if available or throw error?
    // No, I should import supabase.

    // Let's assume I fix imports in a separate step or add it here if I can.
    // Wait, replace_file_content replaces a block. I can't add import at top effectively from here without another call.
    // I will assume `import { supabase } from '../../supabase';` is needed.

    // Actual Logic:
    const { action, entity, data } = item;

    if (entity === 'booking') {
      const table = 'bookings';
      if (action === 'create') {
        const { error } = await supabase.from(table).insert(data);
        if (error) throw error;
      } else if (action === 'update') {
        const { id, ...updates } = data;
        const { error } = await supabase.from(table).update(updates).eq('id', id);
        if (error) throw error;
      } else if (action === 'delete') {
        const { id } = data;
        const { error } = await supabase
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      }
    } else {
      console.warn(`Unknown entity for sync: ${entity}`);
    }
  }

  // --- Public API ---

  public getStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
    };
  }

  public getQueueSize(): number {
    return this.syncQueue.length;
  }

  public hasPendingItem(entityId: string): boolean {
    return this.syncQueue.some(item => {
      if (!item.data) return false;
      const data = item.data as Record<string, unknown>;
      const candidateId = data.id ?? data.ID;
      return typeof candidateId === 'string' && candidateId === entityId;
    });
  }

  public subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(event: OfflineEvent, data?: unknown) {
    this.listeners.forEach(l => l(event, data));
  }
}

export const offlineManager = new OfflineManagerService();
