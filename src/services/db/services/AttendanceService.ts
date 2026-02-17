
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../supabase';
import { SyncQueueService } from '../../sync/SyncQueue';
import { activityLogService } from './ActivityLogService';
import { db } from '../index';

export interface DailyAttendance {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  totalHours: number;
  isFrozen: boolean;
  createdAt: string;
  updatedAt: string;
}

export class AttendanceService {

  // Configuration
  private readonly LATE_THRESHOLD_HOUR = 10;
  private readonly LATE_THRESHOLD_MINUTE = 15;

  private isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  }

  private getTodayDateString(): string {
     return new Date().toISOString().slice(0, 10);
  }

  /**
  /**
   * Called on FIRST Login of the day.
   */
  async recordCheckIn(user: { id: string; name: string }): Promise<void> {
      const today = this.getTodayDateString();

      // 1. Check if record exists for today
      const existing = await db
          .selectFrom('daily_attendance')
          .selectAll()
          .where('userId', '=', user.id)
          .where('date', '=', today)
          .execute();

      if (existing.length > 0) {
          console.log("🕒 Attendance: Already checked in for today.");
          return;
      }

      // 2. Logic: Calculate Status
      const now = new Date();
      let status: 'Present' | 'Late' = 'Present';

      // Late Rule: 10:15 AM
      const threshold = new Date();
      threshold.setHours(this.LATE_THRESHOLD_HOUR, this.LATE_THRESHOLD_MINUTE, 0, 0);

      if (now > threshold) {
          status = 'Late';
      }

      const newRecord: DailyAttendance = {
          id: uuidv4(),
          userId: user.id,
          userName: user.name,
          date: today,
          checkIn: now.toISOString(),
          checkOut: now.toISOString(), // Initialize with same, update later
          status,
          totalHours: 0,
          isFrozen: false,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
      };

      console.log(`🕒 Attendance: Checking In as ${status} at ${now.toLocaleTimeString()}`);

      // 3. Save Local (Kysely)
      await db
          .insertInto('daily_attendance')
          .values({
              id: newRecord.id,
              userId: newRecord.userId,
              userName: newRecord.userName,
              date: newRecord.date,
              checkIn: newRecord.checkIn ?? null,
              checkOut: newRecord.checkOut ?? null,
              status: newRecord.status,
              totalHours: newRecord.totalHours,
              isFrozen: newRecord.isFrozen ? 1 : 0,
              createdAt: newRecord.createdAt,
              updatedAt: newRecord.updatedAt,
          })
          .execute();

      // 4. Log Activity
      await activityLogService.logAction('check_in', 'attendance', newRecord.id, `Checked In (${status})`);

      // 5. Sync Cloud
      this.syncToCloud(newRecord);
  }

  /**
   * Called on Logout or periodically during activity.
   */
  async recordCheckOut(userId: string): Promise<void> {
      const today = this.getTodayDateString();

      const record = await db
          .selectFrom('daily_attendance')
          .selectAll()
          .where('userId', '=', userId)
          .where('date', '=', today)
          .executeTakeFirst();

      if (!record) return; // No check-in found

      const now = new Date();
      
      // Calculate Hours
      const checkInTime = new Date(record.checkIn || now.toISOString());
      const durationMs = now.getTime() - checkInTime.getTime();
      const totalHours = Number((durationMs / (1000 * 60 * 60)).toFixed(2));

      // Update
      const checkOutISO = now.toISOString();
      
      await db
          .updateTable('daily_attendance')
          .set({
              checkOut: checkOutISO,
              totalHours: totalHours,
              updatedAt: checkOutISO
          })
          .where('id', '=', record.id)
          .execute();

      console.log(`🕒 Attendance: Updated Check Out to ${now.toLocaleTimeString()}`);
      
      // Sync Update (Optimized: Debounce or just fire?)
      // for logout we fire immediately
      this.syncUpdateToCloud(record.id, { check_out: checkOutISO, total_hours: totalHours, updated_at: checkOutISO });
  }

  async getAttendanceForToday(): Promise<DailyAttendance[]> {
      const today = this.getTodayDateString();

      try {
          const res = await db
              .selectFrom('daily_attendance')
              .selectAll()
              .where('date', '=', today)
              .execute();
          
          return res.map((r) => ({
              id: r.id,
              userId: r.userId,
              userName: r.userName,
              date: r.date,
              checkIn: r.checkIn || undefined,
              checkOut: r.checkOut || undefined,
              status: r.status as 'Present' | 'Late' | 'Absent' | 'Excused',
              totalHours: r.totalHours || 0,
              isFrozen: Boolean(r.isFrozen),
              createdAt: r.createdAt,
              updatedAt: r.updatedAt
          }));
      } catch (e) {
          console.error("Attendance Fetch Error:", e);
          return [];
      }
  }

  // --- Private Helpers ---

  private async syncToCloud(record: DailyAttendance) {
      // Attendance table in Supabase expects UUID user_id.
      // Local role IDs look like "u_..." and should stay local-only.
      if (!this.isValidUuid(record.userId)) {
          console.warn(
              `⚠️ Attendance cloud sync skipped for non-UUID userId: ${record.userId}`
          );
          return;
      }

      const dbObject = {
          id: record.id,
          user_id: record.userId,
          user_name: record.userName,
          date: record.date,
          check_in: record.checkIn,
          check_out: record.checkOut,
          status: record.status,
          total_hours: record.totalHours,
          is_frozen: record.isFrozen,
          created_at: record.createdAt,
          updated_at: record.updatedAt
      };

      if (navigator.onLine) {
          const { error } = await supabase.from('daily_attendance').insert(dbObject);
          if (error) await SyncQueueService.enqueue('create', 'attendance', dbObject);
      } else {
          await SyncQueueService.enqueue('create', 'attendance', dbObject);
      }
  }

  private async syncUpdateToCloud(id: string, updates: Record<string, unknown>) {
      if (!this.isValidUuid(id)) {
          console.warn(`⚠️ Attendance update sync skipped for non-UUID id: ${id}`);
          return;
      }

      if (navigator.onLine) {
          const { error } = await supabase.from('daily_attendance').update(updates).eq('id', id);
          if (error) await SyncQueueService.enqueue('update', 'attendance', { id, ...updates });
      } else {
          await SyncQueueService.enqueue('update', 'attendance', { id, ...updates });
      }
  }
}

export const attendanceService = new AttendanceService();
