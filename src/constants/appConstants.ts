/**
 * App-wide constants — replaces magic values scattered in the codebase
 */

/** Auto-lock timeout in milliseconds (5 minutes) */
export const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000;

/** Reminder check interval in milliseconds (1 minute) */
export const REMINDER_CHECK_INTERVAL_MS = 60_000;

/** Reminder advance notice window in minutes */
export const REMINDER_ADVANCE_MINUTES = 15;

/** PostgreSQL health check interval in milliseconds (5 seconds) */
export const PG_HEALTH_CHECK_INTERVAL_MS = 5_000;

/** Offline ping interval in milliseconds (5 minutes) */
export const OFFLINE_PING_INTERVAL_MS = 300_000;

/** Sync retry delay in milliseconds (10 seconds) */
export const SYNC_RETRY_DELAY_MS = 10_000;

/** Sync retry delay on busy (5 seconds) */
export const SYNC_BUSY_RETRY_DELAY_MS = 5_000;

/** Max sync retry attempts */
export const MAX_SYNC_RETRIES = 3;

/** Default exchange rate (IQD per USD) */
export const DEFAULT_EXCHANGE_RATE = 1_400;

/** Soft delete cleanup threshold in days */
export const SOFT_DELETE_CLEANUP_DAYS = 30;

/** Memoize cache max entries */
export const MEMOIZE_CACHE_MAX_SIZE = 500;

/** Slow operation threshold in ms (for PerformanceMonitor) */
export const SLOW_OPERATION_THRESHOLD_MS = 100;

/** Frame budget at 60fps in ms */
export const FRAME_BUDGET_MS = 16;
