
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../supabase';
import { SyncQueueService } from '../../sync/SyncQueue';
import { db } from '../index';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

export class ActivityLogService {
  
  /**
   * Log an action to the system.
   * Works offline first, then syncs.
   */
  async logAction(
    action: string,
    entityType: string,
    entityId: string,
    details: string,
    user?: { id: string; name: string }
  ): Promise<void> {
    
    // 1. Get User Context
    const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
    const logItem: ActivityLog = {
      id: uuidv4(),
      userId: currentUser.id || 'system',
      userName: currentUser.name || 'System',
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString()
    };

    console.log(`📝 Logging Action: ${action} on ${entityType}`);

    // 2. Save Locally
    try {
        await db
            .insertInto('activity_logs')
            .values({
                id: logItem.id,
                userId: logItem.userId,
                userName: logItem.userName,
                action: logItem.action,
                entityType: logItem.entityType,
                entityId: logItem.entityId || null,
                details: logItem.details || null,
                createdAt: logItem.createdAt
            })
            .execute();
    } catch (e) {
        console.error("Failed to save log locally:", e);
    }

    // 3. Sync to Cloud (Fire & Forget)
    if (navigator.onLine) {
        supabase.from('activity_logs').insert({
            id: logItem.id,
            user_id: logItem.userId,
            user_name: logItem.userName,
            action: logItem.action,
            entity_type: logItem.entityType,
            entity_id: logItem.entityId,
            details: logItem.details,
            created_at: logItem.createdAt
        }).then(({ error }) => {
            if (error) console.error("Failed to sync log to cloud:", error);
        });
    } else {
        // Queue for later
        await SyncQueueService.enqueue('create', 'activity_log', logItem);
    }
  }

  /**
   * Get recent logs for UI
   */
  async getRecentLogs(limit = 50): Promise<ActivityLog[]> {
      try {
          // Fetch from local DB
          const result = await db
              .selectFrom('activity_logs')
              .selectAll()
              .orderBy('createdAt', 'desc')
              .limit(limit)
              .execute();
          
          return result.map((row) => ({
              id: row.id,
              userId: row.userId,
              userName: row.userName,
              action: row.action,
              entityType: row.entityType,
              entityId: row.entityId || undefined,
              details: row.details || undefined,
              createdAt: row.createdAt
          }));
      } catch (e) {
          console.error("Failed to fetch logs:", e);
          return [];
      }
  }
}

export const activityLogService = new ActivityLogService();
