
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../supabase';
import { SyncQueueService } from '../../sync/SyncQueue';
import { activityLogService } from './ActivityLogService';
import { db } from '../index';

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  type: 'Sick' | 'Vacation' | 'Emergency' | 'Other';
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  createdAt: string;
}

export class LeaveService {

  async addLeaveForEmployee(
    userId: string,
    userName: string,
    data: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'userName' | 'userId'>
  ): Promise<LeaveRequest> {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

      const newLeave: LeaveRequest = {
          id: uuidv4(),
          userId,
          userName,
          startDate: data.startDate,
          endDate: data.endDate,
          type: data.type,
          reason: data.reason || '',
          status: 'Approved', // Admin-added leaves are auto-approved
          approvedBy: currentUser.name || 'Admin',
          createdAt: new Date().toISOString()
      };

      const now = new Date().toISOString();

      await db
          .insertInto('leaves')
          .values({
              id: newLeave.id,
              userId: newLeave.userId,
              userName: newLeave.userName,
              startDate: newLeave.startDate,
              endDate: newLeave.endDate,
              type: newLeave.type,
              reason: newLeave.reason,
              status: newLeave.status,
              createdAt: newLeave.createdAt,
              updatedAt: now,
              approvedBy: newLeave.approvedBy || null,
              deletedAt: null
          })
          .execute();

      await activityLogService.logAction(
          'add_leave',
          'leave',
          newLeave.id,
          `Admin added ${newLeave.type} leave for ${userName}`
      );

      const dbObject = {
        id: newLeave.id,
        user_id: newLeave.userId,
        user_name: newLeave.userName,
        start_date: newLeave.startDate,
        end_date: newLeave.endDate,
        type: newLeave.type,
        reason: newLeave.reason,
        status: newLeave.status,
        approved_by: newLeave.approvedBy,
        created_at: newLeave.createdAt
      };

      if (navigator.onLine) {
          const { error } = await supabase.from('leaves').insert(dbObject);
          if (error) {
              console.error("Cloud sync failed for leave:", error);
              await SyncQueueService.enqueue('create', 'leave', dbObject);
          }
      } else {
          await SyncQueueService.enqueue('create', 'leave', dbObject);
      }

      return newLeave;
  }

  async requestLeave(data: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'userName' | 'userId'>): Promise<LeaveRequest> {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      const newLeave: LeaveRequest = {
          id: uuidv4(),
          userId: currentUser.id || 'unknown',
          userName: currentUser.name || 'Unknown',
          startDate: data.startDate,
          endDate: data.endDate,
          type: data.type,
          reason: data.reason || '',
          status: 'Pending',
          createdAt: new Date().toISOString()
      };

      // 1. Save Local (Kysely)
      const dataToInsert = {
        ...newLeave,
        approvedBy: undefined, // Let DB handle null/undefined or Kysely omit
        updatedAt: new Date().toISOString(),
        deletedAt: undefined 
      };

      await db
          .insertInto('leaves')
          .values({
              id: dataToInsert.id,
              userId: dataToInsert.userId,
              userName: dataToInsert.userName,
              startDate: dataToInsert.startDate,
              endDate: dataToInsert.endDate,
              type: dataToInsert.type,
              reason: dataToInsert.reason,
              status: dataToInsert.status,
              createdAt: dataToInsert.createdAt,
              updatedAt: dataToInsert.updatedAt,
              approvedBy: null, // explicit null
              deletedAt: null
          })
          .execute();

      // 2. Log Activity
      await activityLogService.logAction('leave_request', 'leave', newLeave.id, `New ${newLeave.type} leave request from ${newLeave.userName}`);

      // 3. Sync Cloud
      const dbObject = {
        id: newLeave.id,
        user_id: newLeave.userId,
        user_name: newLeave.userName,
        start_date: newLeave.startDate,
        end_date: newLeave.endDate,
        type: newLeave.type,
        reason: newLeave.reason,
        status: newLeave.status,
        created_at: newLeave.createdAt
      };

      if (navigator.onLine) {
          const { error } = await supabase.from('leaves').insert(dbObject);
          if (error) {
              console.error("Cloud sync failed for leave:", error);
              await SyncQueueService.enqueue('create', 'leave', dbObject);
          }
      } else {
          await SyncQueueService.enqueue('create', 'leave', dbObject);
      }

      return newLeave;
  }

  async updateLeaveStatus(leaveId: string, status: 'Approved' | 'Rejected'): Promise<void> {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const managerName = currentUser.name || 'Manager';

      // 1. Update Local (Kysely)
      const now = new Date().toISOString();
      
      await db
          .updateTable('leaves')
          .set({
              status: status,
              approvedBy: managerName,
              updatedAt: now
          })
          .where('id', '=', leaveId)
          .execute();

      // 2. Log Activity
      await activityLogService.logAction(
          status === 'Approved' ? 'approve_leave' : 'reject_leave', 
          'leave', 
          leaveId, 
          `${status} leave request ${leaveId}`
      );

      // 3. Sync Cloud
      const updates = { status, approved_by: managerName, updated_at: now };
      
      if (navigator.onLine) {
          const { error } = await supabase.from('leaves').update(updates).eq('id', leaveId);
          if (error) await SyncQueueService.enqueue('update', 'leave', { id: leaveId, ...updates });
      } else {
          await SyncQueueService.enqueue('update', 'leave', { id: leaveId, ...updates });
      }
  }

  async getAllLeaves(): Promise<LeaveRequest[]> {
      try {
          const result = await db
              .selectFrom('leaves')
              .selectAll()
              .orderBy('createdAt', 'desc')
              .execute();

          return result.map((r) => ({
              id: r.id,
              userId: r.userId,
              userName: r.userName,
              startDate: r.startDate,
              endDate: r.endDate,
              type: r.type as 'Sick' | 'Vacation' | 'Emergency' | 'Other',
              reason: r.reason || '',
              status: r.status as 'Pending' | 'Approved' | 'Rejected',
              approvedBy: r.approvedBy || undefined,
              createdAt: r.createdAt
          }));
      } catch (e) {
          console.error("Error fetching leaves:", e);
          return [];
      }
  }
}

export const leaveService = new LeaveService();
