import { db } from '../db/index';
import { v4 as uuidv4 } from 'uuid';

export type SyncAction = 'create' | 'update' | 'delete';
export type SyncEntity =
  | 'booking'
  | 'user'
  | 'attendance'
  | 'leave'
  | 'activity_log'
  | 'payment'
  | 'add_on'
  | 'add_on_audit'
  | 'add_on_notification'
  | 'invoice'
  | 'client_transaction'
  | 'session'
  | 'session_image';

export interface QueueItem {
  id: string;
  action: SyncAction;
  entity: SyncEntity;
  data: Record<string, unknown>;
  createdAt: number;
  retryCount?: number;
}

export class SyncQueueService {
  /**
   * Add an item to the persistent sync queue
   */
  static async enqueue(action: SyncAction, entity: SyncEntity, data: any) {
    try {
      const id = uuidv4();
      const createdAt = Date.now();
      const dataStr = JSON.stringify(data);

      await db
        .insertInto('sync_queue')
        .values({
          id,
          action,
          entity,
          data: dataStr,
          createdAt: createdAt.toString(), // Schema says TEXT, but logic uses number. Schema: createdAt TEXT. We should verify if TEXT or INTEGER. Schema says TEXT. I will cast to string.
          // Wait, `SyncQueueTable` in types.ts says `createdAt: string`.
          // But `QueueItem` interface says `createdAt: number`.
          // And `db.run` was passing `createdAt` (number).
          // If schema is TEXT, passing a number might store it as string "12345".
          // I will verify types.ts.
          // In types.ts: `createdAt: string`.
          // So I should convert to string.
          status: 'pending',
        })
        .execute();
      console.log(`📥 SyncQueue: Enqueued [${action} ${entity}]`);
    } catch (error) {
      console.error('❌ SyncQueue Enqueue Failed:', error);
    }
  }

  /**
   * Safely parse JSON wrapper
   */
  private static safeParse(value: unknown): Record<string, unknown> | null {
    if (!value || value === 'undefined') return null;
    try {
      return JSON.parse(value as string) as Record<string, unknown>;
    } catch (e) {
      console.warn(`⚠️ SyncQueue: Skipping corrupt data:`, value);
      return null;
    }
  }

  /**
   * Get all pending items ordered by creation time (FIFO)
   */
  static async peekAll(): Promise<QueueItem[]> {
    try {
      const rawItems = await db
        .selectFrom('sync_queue')
        .selectAll()
        .where('status', '=', 'pending')
        .orderBy('createdAt', 'asc')
        .execute();

      // Defensive programming: Filter out corrupt items
      return rawItems
        .map(item => {
          const parsedData = this.safeParse(item.data);
          if (!parsedData) return null;

          return {
            id: item.id,
            action: item.action as SyncAction,
            entity: item.entity as SyncEntity,
            data: parsedData,
            createdAt: Number(item.createdAt), // Convert back to number
            retryCount: item.retryCount || 0,
          };
        })
        .filter(item => item !== null) as QueueItem[];
    } catch (error) {
      console.error('❌ SyncQueue Peek Failed:', error);
      return [];
    }
  }

  /**
   * Update retry count for an item
   */
  static async updateRetryCount(id: string, retryCount: number) {
    try {
      await db
        .updateTable('sync_queue')
        .set({ retryCount })
        .where('id', '=', id)
        .execute();
      console.log(`🔄 SyncQueue: Updated retry count for [${id}] to ${retryCount}`);
    } catch (error) {
      console.error('❌ SyncQueue Update Retry Count Failed:', error);
    }
  }

  /**
   * Mark item as failed (max retries reached)
   */
  static async markAsFailed(id: string) {
    try {
      await db
        .updateTable('sync_queue')
        .set({ status: 'failed' })
        .where('id', '=', id)
        .execute();
      console.log(`❌ SyncQueue: Marked [${id}] as failed`);
    } catch (error) {
      console.error('❌ SyncQueue Mark Failed:', error);
    }
  }

  /**
   * Remove an item from the queue (after successful sync)
   */
  static async dequeue(id: string) {
    try {
      await db.deleteFrom('sync_queue').where('id', '=', id).execute();
      console.log(`📤 SyncQueue: Dequeued [${id}]`);
    } catch (error) {
      console.error('❌ SyncQueue Dequeue Failed:', error);
    }
  }

  /**
   * Clear the entire queue (Emergency Reset)
   */
  static async clear() {
    await db.deleteFrom('sync_queue').execute();
  }
}
