/**
 * Utilities for cleaning up fake/test data from the application
 */
import { electronBackend } from '../services/mockBackend';

/**
 * Clean up all fake/test data from local SQLite database
 * Run this on app startup to ensure clean state
 */
export async function cleanupLocalDatabase(): Promise<void> {
  try {
    const api = (window as any).electronAPI;
    if (!api?.db) return;

    console.log('[Cleanup] 🧹 Starting local database cleanup...');

    // 1. Delete old tasks from deleted bookings
    const deletedTasks = await api.db.query(`
      DELETE FROM dashboard_tasks 
      WHERE bookingId NOT IN (
        SELECT id FROM bookings WHERE deletedAt IS NULL
      )
      OR createdAt < date('now', '-30 days')
    `);
    console.log('[Cleanup] ✅ Deleted old tasks:', deletedTasks);

    // 2. Delete temp photos older than 7 days
    const oldPhotos = await api.db.query(`
      DELETE FROM temp_photos 
      WHERE createdAt < date('now', '-7 days')
    `);
    console.log('[Cleanup] ✅ Deleted old temp photos:', oldPhotos);

    // 3. Clean up old activity logs (keep last 90 days)
    const oldLogs = await api.db.query(`
      DELETE FROM activity_logs 
      WHERE createdAt < date('now', '-90 days')
    `);
    console.log('[Cleanup] ✅ Deleted old activity logs:', oldLogs);

    console.log('[Cleanup] ✅ Local database cleanup complete');
  } catch (error) {
    console.error('[Cleanup] ❌ Error during cleanup:', error);
  }
}

/**
 * Check if a booking is test/fake data
 */
export function isTestBooking(booking: { 
  clientName?: string; 
  title?: string; 
  clientPhone?: string;
}): boolean {
  const name = (booking.clientName || '').toLowerCase();
  const title = (booking.title || '').toLowerCase();
  const phone = booking.clientPhone || '';

  const isTestName = name.includes('test') || 
                     name.includes('demo') || 
                     name.includes('tst') || 
                     name === 'h';
  
  const isTestTitle = title.includes('test') || 
                      title.includes('demo');
  
  const isFakePhone = phone === '07700000000' || 
                      phone === '123456' || 
                      phone === '000000' ||
                      phone === '';

  return isTestName || isTestTitle || isFakePhone;
}
