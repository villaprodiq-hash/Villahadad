import { CurrentUserService } from './CurrentUserService';
import { db } from './db/index';

export type ActivityAction = 
  | 'create_booking'
  | 'update_booking'
  | 'delete_booking'
  | 'receive_payment'
  | 'change_status'
  | 'assign_photographer'
  | 'upload_media'
  | 'other';

export interface ActivityLogEntry {
  id: string;
  entityType: string; // 'booking', 'payment', 'user', etc.
  entityId: string;
  action: ActivityAction;
  performedBy: string; // Employee name
  performedByRole: string; // Role label
  details?: string; // JSON string with additional info
  createdAt: string;
}

class ActivityLoggerClass {
  /**
   * Log an activity
   */
  async log(
    entityType: string,
    entityId: string,
    action: ActivityAction,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const user = CurrentUserService.getCurrentUser();
      if (!user) {
        console.warn('Cannot log activity: No user logged in');
        return;
      }

      const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date().toISOString();
      
      const detailsWithRole = details ? { ...details, role: user.roleLabel } : { role: user.roleLabel };
      const detailsStr = JSON.stringify(detailsWithRole);

      await db
          .insertInto('activity_logs')
          .values({
            id,
            userId: user.id || 'unknown',
            userName: user.name,
            action,
            entityType,
            entityId,
            details: detailsStr,
            createdAt
          })
          .execute();
      
      console.log('📝 Activity Logged:', action);

    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Get activity log for an entity
   */
  async getActivityLog(entityType: string, entityId: string): Promise<ActivityLogEntry[]> {
    try {
      const result = await db
        .selectFrom('activity_logs')
        .selectAll()
        .where('entityType', '=', entityType)
        .where('entityId', '=', entityId)
        .orderBy('createdAt', 'desc')
        .execute();

      return result.map((row) => {
          // Parse role from details if possible
          let role = 'Unknown';
          const details = row.details;
          if (row.details) {
              try {
                  const d = JSON.parse(row.details);
                  if (d.role) role = d.role;
              } catch(e) { /* ignore malformed JSON in activity details */ }
          }

          return {
            id: row.id,
            entityType: row.entityType,
            entityId: row.entityId || '', // Schema allows null, types say string? types say entityId: string | null. Entry says string. I'll default empty.
            action: row.action as ActivityAction,
            performedBy: row.userName,
            performedByRole: role,
            details: row.details || undefined,
            createdAt: row.createdAt,
          };
      });
    } catch (e) {
      console.error('Failed to get activity log:', e);
      return [];
    }
  }
}

// Export singleton instance
export const ActivityLogger = new ActivityLoggerClass();
