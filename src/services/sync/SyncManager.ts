import { supabase, callSyncFunction } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { UserRepository as userRepo } from '../db/repositories/UserRepository';
import { BookingRepository as bookingRepo } from '../db/repositories/BookingRepository';
import { SyncQueueService } from './SyncQueue';
import { toast } from 'sonner';
import type { Booking } from '../../types';
import type { User } from '../../types';
import {
  MAX_SYNC_RETRIES,
  SYNC_RETRY_DELAY_MS,
  SYNC_BUSY_RETRY_DELAY_MS,
} from '../../constants/appConstants';

/**
 * 🔄 HYBRID SYNC ENGINE
 * Orchestrates the data flow between Local SQLite (Offline) and Supabase (Cloud).
 */
export class SyncManager {
  static isOnline = navigator.onLine;
  private static currentLocalUserId: string | null = null; // ✅ Track current staff member
  private static networkListenersAttached = false; // ✅ Prevent duplicate listeners
  private static onlineHandler: (() => void) | null = null;
  private static offlineHandler: (() => void) | null = null;
  private static syncInProgress = false; // 🔒 SECURITY: Prevent race conditions
  private static pendingRetryTimer: ReturnType<typeof setTimeout> | null = null; // 🔒 Single retry guard

  // 🔔 Real-time Event Emitter for UI Updates
  private static listeners: Set<(event: string, data?: unknown) => void> = new Set();

  /**
   * Subscribe to real-time sync events
   * Use in React components to get instant updates
   */
  static onSync(callback: (event: string, data?: unknown) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of a sync event
   */
  private static emit(event: string, data?: unknown) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (e) {
        console.error('❌ SyncManager: Listener error:', e);
      }
    });
  }

  /**
   * Set current logged-in user (for audit trail)
   */
  static setCurrentUser(userId: string | null) {
    this.currentLocalUserId = userId;
    console.log(`👤 SyncManager: Current User Set: ${userId}`);
  }

  static async init() {
    console.log('🔄 SyncManager: Initializing...');

    // One-time hygiene: remove legacy attendance rows that cannot sync (non-UUID user_id).
    const purgedAttendanceItems = await SyncQueueService.purgeInvalidAttendanceItems();
    if (purgedAttendanceItems > 0) {
      console.log(
        `🧹 SyncManager: Purged ${purgedAttendanceItems} invalid attendance item(s) from sync queue`
      );
    }

    // One-time recovery: revive previously failed session/session_image items
    // after schema-compat sync improvements.
    const revivedGalleryItems = await SyncQueueService.reviveFailedByEntities([
      'session',
      'session_image',
    ]);
    if (revivedGalleryItems > 0) {
      console.log(
        `♻️ SyncManager: Revived ${revivedGalleryItems} failed gallery sync item(s)`
      );
    }

    // 1. Listen for network changes (✅ FIX: Add cleanup tracking)
    if (!this.networkListenersAttached) {
      this.onlineHandler = () => this.handleNetworkChange(true);
      this.offlineHandler = () => this.handleNetworkChange(false);

      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('offline', this.offlineHandler);
      this.networkListenersAttached = true;
      console.log('✅ SyncManager: Network listeners attached');
    }

    // 2. Listen for Auth Changes (Trigger Sync on Login)
    supabase.auth.onAuthStateChange(async (event, _session) => {
      console.log(`🔐 Auth State Changed: ${event}`);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        console.log('✅ SyncManager: User Session Active - Starting Sync...');

        // 3. Initial connection test & Sync
        const connected = await this.testConnection();
        if (connected) {
          await this.pushChanges();
          this.subscribeToChanges();
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 SyncManager: User Signed Out - Pausing Sync.');
        // Only remove OUR sync channels
        if (this.syncBookingsChannel) {
          supabase.removeChannel(this.syncBookingsChannel);
          this.syncBookingsChannel = null;
        }
        if (this.syncUsersChannel) {
          supabase.removeChannel(this.syncUsersChannel);
          this.syncUsersChannel = null;
        }
      }
    });
  }

  /**
   * ✅ NEW: Cleanup method to prevent memory leaks
   */
  static cleanup() {
    if (this.networkListenersAttached && this.onlineHandler && this.offlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      window.removeEventListener('offline', this.offlineHandler);
      this.networkListenersAttached = false;
      console.log('🧹 SyncManager: Network listeners cleaned up');
    }
    supabase.removeAllChannels();
  }

  private static async handleNetworkChange(status: boolean) {
    this.isOnline = status;
    console.log(`📡 Network Status: ${status ? 'ONLINE' : 'OFFLINE'}`);
    if (status) {
      // Only push if we have a session
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await this.pushChanges();
      }
    }
  }

  /**
   * Test connection to Supabase
   */
  static async testConnection() {
    try {
      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      console.log('✅ SyncManager: Connected to Supabase Cloud! Users Count:', count);
      return true;
    } catch (err) {
      console.error('❌ SyncManager: Connection Failed:', err);
      return false;
    }
  }

  /**
   * Push local changes to Supabase (Smart Sync via Queue)
   */
  static async pushChanges() {
    if (!this.isOnline) return;
    console.log('🔄 SyncManager: Starting Data Sync (Queue -> Cloud)...');
    await this.processSyncQueue();
  }

  /**
   * Schedule a single retry — cancels any existing pending retry to prevent storm
   */
  private static scheduleRetry(delayMs: number) {
    if (this.pendingRetryTimer) {
      clearTimeout(this.pendingRetryTimer);
    }
    this.pendingRetryTimer = setTimeout(() => {
      this.pendingRetryTimer = null;
      this.pushChanges();
    }, delayMs);
  }

  /**
   * Process persistent offline queue with "Smart Rank" logic
   */
  private static async processSyncQueue() {
    // 🔒 SECURITY: Prevent concurrent sync operations
    if (this.syncInProgress) {
      console.log('⚠️ SyncManager: Sync already in progress, scheduling single retry...');
      this.scheduleRetry(SYNC_BUSY_RETRY_DELAY_MS);
      return;
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    let processedCount = 0;
    let failedCount = 0;

    try {
      const queueItems = await SyncQueueService.peekAll();
      if (queueItems.length === 0) {
        console.log('✅ SyncManager: Queue is empty.');
        this.syncInProgress = false; // 🔓 تحرير القفل
        return;
      }

      console.log(`🚀 SyncManager: Processing ${queueItems.length} offline items...`);

      for (const item of queueItems) {
        try {
          let success = false;

          // 🧹 SANITIZATION: Remove problematic camelCase keys from old queue items AND PROVIDE FALLBACKS
          const sanitize = (entity: string, d: Record<string, unknown>) => {
            const clean = { ...d };
            delete clean.createdBy;
            delete clean.updatedBy;
            delete clean.createdByRole;
            delete clean.createdByName;
            delete clean.updatedByName;

            // Booking-only normalization (do not pollute other entities)
            if (entity === 'booking') {
              if (!clean.category) clean.category = 'Wedding';
              if (!clean.title) clean.title = 'Untitled';
              if (!clean.clientName) clean.client_name = clean.clientName || 'Unknown';
              if (!clean.created_at) clean.created_at = new Date().toISOString();

              if (clean.isPriority !== undefined) clean.is_priority = clean.isPriority ? 1 : 0;
              if (clean.isCrewShooting !== undefined)
                clean.is_crew_shooting = clean.isCrewShooting ? 1 : 0;
            }

            return clean;
          };

          const cleanData = sanitize(item.entity, item.data);
          const attempts = item.retryCount || 0;
          console.log(
            `🔄 Processing Item ${item.id} (Attempt ${attempts + 1}/${MAX_SYNC_RETRIES}):`,
            cleanData.id || cleanData
          );

          // 🔒 SECURITY: Use Edge Function for sync operations (keeps service key server-side)
          if (item.entity === 'booking' && item.action === 'create') {
            const result = await callSyncFunction('create', 'booking', cleanData);
            if (result.success) {
              success = true;
              console.log(`✅ Successfully synced item ${item.id}`);
            } else if (result.error?.includes('23505') || result.error?.includes('duplicate')) {
              // Handle duplicate key error
              console.warn('⚠️ Duplicate ID in queue, attempting Smart Update resolution...');
              success = await this.resolveBookingConflict(cleanData);
            } else {
              console.error(`❌ Sync failed for item: ${item.id}`, result.error);
              throw new Error(result.error || 'Sync failed');
            }
          } else if (item.entity === 'booking' && item.action === 'update') {
            success = await this.resolveBookingConflict(cleanData);
          } else if (item.entity === 'booking' && item.action === 'delete') {
            const result = await callSyncFunction('delete', 'booking', {
              id: cleanData.id,
              soft: true,
            });
            if (result.success) {
              success = true;
              console.log(`✅ Successfully soft-deleted item ${item.id}`);
            } else {
              throw new Error(result.error || 'Delete failed');
            }
          } else {
            const result = await callSyncFunction(item.action, item.entity, cleanData);
            if (result.success) {
              success = true;
              console.log(`✅ Successfully synced [${item.entity}] item ${item.id}`);
            } else {
              throw new Error(result.error || `Sync failed for entity ${item.entity}`);
            }
          }

          if (success) {
            await SyncQueueService.dequeue(item.id);
            processedCount++;
          } else {
            // Retry logic for failed items
            const newRetryCount = (item.retryCount || 0) + 1;
            if (newRetryCount < MAX_SYNC_RETRIES) {
              await SyncQueueService.updateRetryCount(item.id, newRetryCount);
              console.log(`🔄 Scheduled retry for item ${item.id} (attempt ${newRetryCount})`);
            } else {
              await SyncQueueService.markAsFailed(item.id);
              failedCount++;
              console.error(`❌ Item ${item.id} failed after 3 attempts`);
            }
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(
            `❌ CRITICAL: Failed to sync item ${item.id} [${item.entity}]:`,
            errMsg
          );
          failedCount++;

          // Permanent failures: don't retry items that will never succeed
          const isPermanent =
            errMsg.includes('not yet uploaded') ||
            errMsg.includes('violates not-null') ||
            errMsg.includes('Skipping sync') ||
            errMsg.includes('relation') ||
            errMsg.includes('does not exist') ||
            errMsg.includes('Missing SERVICE_ROLE_KEY') ||
            errMsg.includes('Invalid API key') ||
            errMsg.includes('invalid input syntax for type uuid') ||
            errMsg.includes('permission denied');

          if (isPermanent) {
            console.warn(`🗑️ Permanently failing item ${item.id} — will not retry`);
            await SyncQueueService.markAsFailed(item.id);
          } else {
            // Retry logic for transient exceptions
            const newRetryCount = (item.retryCount || 0) + 1;
            if (newRetryCount < MAX_SYNC_RETRIES) {
              await SyncQueueService.updateRetryCount(item.id, newRetryCount);
            } else {
              await SyncQueueService.markAsFailed(item.id);
            }
          }
        }
      }

      // 🚀 FORCE UI REFRESH after processing batch
      console.log(
        `🏁 Sync Batch Complete. Processed: ${processedCount}, Failed: ${failedCount}. Time: ${Date.now() - startTime}ms`
      );
      window.dispatchEvent(
        new CustomEvent('sync-complete', {
          detail: { processed: processedCount, failed: failedCount },
        })
      );

      // Show toast notification for results
      if (failedCount > 0) {
        toast.warning(`تم مزامنة ${processedCount} عنصر، ${failedCount} فشل`);
      } else if (processedCount > 0) {
        toast.success(`تم مزامنة ${processedCount} عنصر بنجاح ✅`);
      }
    } catch (criticalError) {
      console.error('❌ Critical sync error:', criticalError);
      toast.error('فشلت المزامنة - سيتم إعادة المحاولة تلقائياً');
    } finally {
      // 🔒 Always release lock
      this.syncInProgress = false;

      // If there are still pending items, schedule a single retry (deduplicated)
      const remainingItems = await SyncQueueService.peekAll();
      if (remainingItems.length > 0) {
        console.log(`🔄 ${remainingItems.length} items remaining, scheduling retry...`);
        this.scheduleRetry(SYNC_RETRY_DELAY_MS);
      }
    }
  }

  /**
   * Resolve Booking Conflict using "Smart Rank Rule"
   */
  private static async resolveBookingConflict(
    localData: Record<string, unknown>
  ): Promise<boolean> {
    // 🔒 SECURITY: Use Edge Function for conflict resolution (keeps service key server-side)
    const localId = String(localData.id);
    const localLastEditorRank = String(localData.last_editor_rank || '');
    const localUpdatedByName = String(localData.updated_by_name || '');

    // 1. Fetch Remote Version using regular client (read-only, no admin needed)
    const { data: remoteData, error } = await supabase
      .from('bookings')
      .select('last_editor_rank, updated_by_name')
      .eq('id', localId)
      .single();

    if (error || !remoteData) {
      // Remote doesn't exist? Force upsert via Edge Function
      console.log("🌐 Remote doesn't exist, upserting via Edge Function...");
      const result = await callSyncFunction('upsert', 'booking', localData);
      return result.success;
    }

    // 2. Compare Ranks
    const localRank = this.getRankValue(localLastEditorRank);
    const remoteRank = this.getRankValue(String(remoteData.last_editor_rank || 'RECEPTION'));

    console.log(
      `⚔️ Conflict Resolution: Local(${localLastEditorRank}) vs Remote(${remoteData.last_editor_rank})`
    );

    // RULE 1: Self-Correction (Same User -> Always Win)
    if (localUpdatedByName === remoteData.updated_by_name) {
      console.log('✅ Self-Correction detected. Overwriting via Edge Function.');
      const result = await callSyncFunction('upsert', 'booking', localData);
      return result.success;
    }

    // RULE 2: Rank Hierarchy
    if (localRank >= remoteRank) {
      console.log('🥇 Local Rank >= Remote Rank. Overwriting via Edge Function.');
      const result = await callSyncFunction('upsert', 'booking', localData);
      return result.success;
    } else {
      console.log('🛑 Local Rank < Remote Rank. Creating Draft Conflict via Edge Function.');
      // RULE 3: Lower Rank -> Draft Conflict
      const result = await callSyncFunction('resolve_conflict', 'booking', {
        localData,
        resolution: 'draft',
      });

      if (result.success) {
        // Notify user locally?
        // For now, we return TRUE so it leaves the sync queue.
        // It is "Handled" by moving to conflicts table.
        return true;
      }
      return false;
    }
  }

  private static getRankValue(rank: string): number {
    const r = (rank || '').toUpperCase();
    if (r === 'MANAGER') return 3; // Sura (Top Authority)
    if (r === 'ADMIN' || r === 'SUPERVISOR') return 2; // Supervisors
    return 1; // RECEPTION / Default
  }

  /**
   * Subscribe to Real-time Changes (Cloud -> Local)
   * Cleans up previous subscriptions before creating new ones to prevent leaks.
   */
  private static syncBookingsChannel: RealtimeChannel | null = null;
  private static syncUsersChannel: RealtimeChannel | null = null;

  static subscribeToChanges() {
    // Remove only OUR previous sync channels (not all channels which kills mockBackend subscriptions)
    if (this.syncBookingsChannel) {
      supabase.removeChannel(this.syncBookingsChannel);
      this.syncBookingsChannel = null;
    }
    if (this.syncUsersChannel) {
      supabase.removeChannel(this.syncUsersChannel);
      this.syncUsersChannel = null;
    }

    this.syncBookingsChannel = supabase
      .channel('sync:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        async payload => {
          await this.handleCloudBookingChange(payload);
        }
      )
      .subscribe();

    this.syncUsersChannel = supabase
      .channel('sync:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async payload => {
        await this.handleCloudUserChange(payload);
      })
      .subscribe();
  }

  /**
   * Handle Booking Change from Cloud
   */
  private static async handleCloudBookingChange(payload: {
    new: Record<string, unknown>;
    old: Record<string, unknown>;
    eventType: string;
  }) {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      // Map Snake_Case (Cloud) -> CamelCase (Local)
      // TODO: Extract this mapper to a shared utility
      const mapToLocal = (
        r: Record<string, unknown>
      ): Partial<Booking> & { deletedAt?: number | null } => ({
        id: String(r.id),
        clientName: String(r.client_name || ''),
        clientPhone: String(r.phone || r.client_phone || ''),
        title: String(r.title || r.event_title || ''),
        shootDate: String(r.shoot_date || ''),
        status: String(r.status) as Booking['status'],
        totalAmount: Number(r.total_amount || 0),
        paidAmount: Number(r.paid_amount || 0),
        currency: String(r.currency || 'IQD') as Booking['currency'],
        details: r.details as Booking['details'],
        location: String(r.location || 'Studio'),
        clientId: String(r.client_id || 'unknown'),
        category: String(r.category || 'wedding') as Booking['category'],
        servicePackage: String(r.service_package || 'basic'),
        isPriority: Boolean(r.is_priority || r.isPriority),
        isCrewShooting: Boolean(r.is_crew_shooting || r.isCrewShooting),
        deletedAt: r.deleted_at ? Date.parse(String(r.deleted_at)) : undefined,
      });

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const localData = mapToLocal(newRecord);
        const localId = String(localData.id);

        // Check if this UPDATE is actually a soft delete
        if (localData.deletedAt) {
          await bookingRepo.softDelete(localId);
          console.log(`⬇️ SyncManager: Soft Deleted Local Booking ${localId} (via UPDATE)`);
          this.emit('booking:deleted', { id: localId });
        } else {
          const exists = await bookingRepo.getById(localId);

          if (exists) {
            await bookingRepo.update(localId, localData);
            console.log(`⬇️ SyncManager: Updated Local Booking ${localId}`);
            this.emit('booking:updated', localData);
          } else {
            await bookingRepo.create(localData as Booking);
            console.log(`⬇️ SyncManager: Created Local Booking ${localId}`);
            this.emit('booking:created', localData);
          }
        }
      } else if (eventType === 'DELETE') {
        if (oldRecord && oldRecord.id) {
          await bookingRepo.softDelete(String(oldRecord.id));
          console.log(`⬇️ SyncManager: Soft Deleted Local Booking ${oldRecord.id}`);
          this.emit('booking:deleted', { id: oldRecord.id });
        }
      }
    } catch (err) {
      console.error('❌ SyncManager: Failed to apply Booking change:', err);
    }
  }

  /**
   * Handle User Change from Cloud
   */
  private static async handleCloudUserChange(payload: {
    new: Record<string, unknown>;
    old: Record<string, unknown>;
    eventType: string;
  }) {
    try {
      const { eventType, new: newRecord } = payload;

      const mapToLocal = (r: Record<string, unknown>): Partial<User> => ({
        id: String(r.id),
        name: String(r.name || ''),
        email: String(r.email || ''),
        role: String(r.role || '').toLowerCase() as User['role'],
        avatar: String(r.avatar_url || ''),
      });

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const localData = mapToLocal(newRecord);
        const localId = String(localData.id);
        // Upsert logic
        const exists = await userRepo.getById(localId);
        if (exists) {
          await userRepo.update(localId, localData);
          this.emit('user:updated', localData);
        } else {
          await userRepo.create(localData as User);
          this.emit('user:created', localData);
        }
        console.log(`⬇️ SyncManager: Upserted Local User ${localId}`);
      }
    } catch (err) {
      console.error('❌ SyncManager: Failed to apply User change:', err);
    }
  }
}
