import { db } from '../index';
import { ReminderSchema } from '../validation';
import { Reminder } from '../../../types';

export class ReminderService {
  async getReminders(bookingId: string): Promise<Reminder[]> {
      // deletedAt IS NULL check is important
    const res = await db
      .selectFrom('reminders')
      .selectAll()
      .where('bookingId', '=', bookingId)
      .where('deletedAt', 'is', null)
      .execute();

      return res as unknown as Reminder[];
  }

  async addReminder(data: any): Promise<Reminder> {
    const validated = ReminderSchema.parse({
      ...data,
      id: data.id || `r_${Date.now()}`,
    });
    
    // Explicitly handle boolean -> integer conversion if needed for SQLite/Kysely consistency
    const insertData = {
        ...validated,
        completed: validated.completed === true ? 1 : 0, // Ensure int
        deletedAt: null // Ensure null explicitly if needed, or let default handle it if column allows null
    };
    
    // Kysely insert
    await db
        .insertInto('reminders')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values(insertData as any)
        .execute();
    
    return validated as unknown as Reminder;
  }

  async toggleReminder(id: string): Promise<void> {
    const record = await db
        .selectFrom('reminders')
        .select('completed')
        .where('id', '=', id)
        .executeTakeFirst();

    if (record) {
      const completed = record.completed ? 0 : 1; // Toggle boolean/int
      await db
          .updateTable('reminders')
          .set({ completed })
          .where('id', '=', id)
          .execute();
    }
  }

  async deleteReminder(id: string): Promise<void> {
    const now = Date.now();
    await db
        .updateTable('reminders')
        .set({ deletedAt: now })
        .where('id', '=', id)
        .execute();
  }

  async updateReminder(id: string, updates: any): Promise<void> {
    if (Object.keys(updates).length === 0) return;

    // Handle boolean conversions
    const safeUpdates = { ...updates };
    if (typeof safeUpdates.completed === 'boolean') {
        safeUpdates.completed = safeUpdates.completed ? 1 : 0;
    }

    await db
        .updateTable('reminders')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(safeUpdates)
        .where('id', '=', id)
        .execute();
  }
}

export const reminderService = new ReminderService();
