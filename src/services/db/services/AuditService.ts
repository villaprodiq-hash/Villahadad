import { activityLogService } from './ActivityLogService';

/**
 * Audit Service
 * Wraps ActivityLogService to provide a simplified interface for business logic auditing.
 * Maps to 'activity_logs' table in the database.
 */
export const auditService = {
  /**
   * Log a business action
   * @param userName - The name of the user performing the action
   * @param action - The action name (e.g., "DELETE_BOOKING")
   * @param details - JSON object or string details
   */
  log: async (userName: string, action: string, details: unknown) => {
    await activityLogService.logAction(
      action,
      'AUDIT',
      'system',
      typeof details === 'string' ? details : JSON.stringify(details),
      { id: 'audit', name: userName }
    );
  },

  /**
   * Get recent audit logs
   * @param limit - Number of logs to retrieve
   */
  getLogs: async (limit = 50) => {
    return await activityLogService.getRecentLogs(limit);
  },
};
