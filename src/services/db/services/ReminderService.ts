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

  async addReminder(
    data: Partial<Reminder> & Pick<Reminder, 'title' | 'dueDate' | 'type'>
  ): Promise<Reminder> {
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
        .values({
          id: insertData.id,
          bookingId: insertData.bookingId || null,
          title: insertData.title,
          dueDate: insertData.dueDate,
          completed: insertData.completed,
          type: insertData.type,
          customIcon: null,
          deletedAt: insertData.deletedAt,
        })
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

  async updateReminder(id: string, updates: Partial<Reminder>): Promise<void> {
    if (Object.keys(updates).length === 0) return;

    const dbUpdates: {
      id?: string;
      bookingId?: string | null;
      title?: string;
      dueDate?: string;
      completed?: number;
      type?: Reminder['type'];
      customIcon?: string | null;
    } = {};

    if (typeof updates.id === 'string') dbUpdates.id = updates.id;
    if (Object.prototype.hasOwnProperty.call(updates, 'bookingId')) {
      dbUpdates.bookingId = updates.bookingId ?? null;
    }
    if (typeof updates.title === 'string') dbUpdates.title = updates.title;
    if (typeof updates.dueDate === 'string') dbUpdates.dueDate = updates.dueDate;
    if (typeof updates.completed === 'boolean') dbUpdates.completed = updates.completed ? 1 : 0;
    if (typeof updates.type === 'string') dbUpdates.type = updates.type;
    if (Object.prototype.hasOwnProperty.call(updates, 'customIcon')) {
      dbUpdates.customIcon = updates.customIcon ?? null;
    }

    await db
        .updateTable('reminders')
        .set(dbUpdates)
        .where('id', '=', id)
        .execute();
  }
}

export const reminderService = new ReminderService();
