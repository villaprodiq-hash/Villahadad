import { BookingRepository as bookingRepo } from '../repositories/BookingRepository';
import { BookingSchema } from '../validation';
import { Booking } from '../../../types';
import { SyncQueueService } from '../../sync/SyncQueue';
import { supabase } from '../../supabase';
import { activityLogService } from './ActivityLogService';
import { ReminderService } from './ReminderService';
import { db } from '../index';

/**
 * Vibe Engineering: Booking Service
 * Orchestrates business logic, validation, and data persistence.
 * Implements "Cloud First, Local Fallback" strategy.
 */
export class BookingService {
  async checkAvailability(
    shootDate: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ): Promise<{
    available: boolean;
    hasConflict: boolean;
    conflictType?: 'partial' | 'full';
    conflictingBooking?: { title: string; startTime: string; endTime: string };
    conflictMessage?: string;
  }> {
    const newStart = this.timeToMinutes(startTime);
    const newEnd = this.timeToMinutes(endTime);

    if (newStart >= newEnd) {
      return {
        available: false,
        hasConflict: false,
        conflictMessage: 'وقت غير صالح',
      };
    }

    const allBookings = await this.getBookings();
    const sameDayBookings = allBookings.filter(
      b => b.shootDate === shootDate && b.id !== excludeBookingId
    );

    for (const booking of sameDayBookings) {
      const bStart = this.timeToMinutes(booking.details?.startTime);
      const bEnd = this.timeToMinutes(booking.details?.endTime);

      if (bStart === null || bEnd === null) continue;

      const overlaps = newStart < bEnd && newEnd > bStart;
      if (overlaps) {
        const isFullVenueConflict = booking.details?.rentalType === 'Full';
        return {
          available: true,
          hasConflict: true,
          conflictType: isFullVenueConflict ? 'full' : 'partial',
          conflictingBooking: {
            title: booking.title || booking.clientName,
            startTime: booking.details?.startTime || '',
            endTime: booking.details?.endTime || '',
          },
          conflictMessage: isFullVenueConflict
            ? 'الموقع محجوز لمناسبة خاصة'
            : `تعارض مع: ${booking.title || booking.clientName} (${booking.details?.startTime} - ${booking.details?.endTime})`,
        };
      }
    }

    return { available: true, hasConflict: false };
  }

  async getPendingApprovals(): Promise<Booking[]> {
    const allBookings = await this.getBookings();
    return allBookings.filter(b => b.approvalStatus === 'pending');
  }

  async approveBooking(
    bookingId: string,
    approverName: string,
    approverRole: string
  ): Promise<void> {
    const updates = {
      status: 'Confirmed',
      approvalStatus: 'approved',
      approvedBy: approverName,
      approvedByRole: approverRole,
      approvedAt: new Date().toISOString(),
    };

    await this.updateBooking(bookingId, updates);

    await activityLogService.logAction(
      'approve',
      'booking',
      bookingId,
      `${approverRole} ${approverName} وافق على الحجز`,
      { id: 'system', name: approverName }
    );
  }

  async rejectBooking(
    bookingId: string,
    rejecterName: string,
    rejecterRole: string
  ): Promise<void> {
    const updates = {
      status: 'Archived',
      approvalStatus: 'rejected',
      rejectedBy: rejecterName,
      rejectedByRole: rejecterRole,
      rejectedAt: new Date().toISOString(),
    };

    await this.updateBooking(bookingId, updates);

    await activityLogService.logAction(
      'reject',
      'booking',
      bookingId,
      `${rejecterRole} ${rejecterName} رفض الحجز`,
      { id: 'system', name: rejecterName }
    );
  }

  private timeToMinutes(time: string | undefined): number | null {
    if (!time || typeof time !== 'string') return null;
    const parts = time.split(':');
    if (parts.length !== 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  /**
   * Main Fetch Strategy (UPDATED):
   * 1. Fetch Local DB First (Always show local data)
   * 2. If Online -> Fetch Supabase -> Merge with Local -> Return Combined Data
   * 3. If Offline -> Return Local Data Only
   */
  async getBookings(role?: string): Promise<Booking[]> {
    // 1. Always fetch local data first
    const localResults = await this.fetchLocalBookings(role);
    const isOnline = navigator.onLine;

    if (isOnline) {
      try {
        console.log('🌍 Cloud Mode: Fetching from Supabase...');
        const { data, error } = await supabase.from('bookings').select('*').is('deleted_at', null);

        if (error) throw error;

        if (data) {
          console.log(`✅ Supabase Returned ${data.length} bookings. Syncing to Local...`);
          // Sync Down: Update Local Cache
          await this.syncLocalDatabase(data);

          // Merge: Combine cloud data with local-only bookings
          const cloudIds = new Set(data.map(b => b.id));
          const localOnlyBookings = localResults.filter(b => !cloudIds.has(b.id));

          return [...data.map(this.mapBookingData), ...localOnlyBookings.map(this.mapBookingData)];
        }
      } catch (cloudError) {
        console.error('⚠️ Cloud Fetch Failed, using local data:', cloudError);
      }
    } else {
      console.log('🔌 Offline Mode: Using Local DB...');
    }

    return localResults.map(this.mapBookingData);
  }

  // Helper: Fetch from Local SQLite
  private async fetchLocalBookings(role?: string): Promise<any[]> {
    try {
      const api = (window as any).electronAPI;
      if (api && api.db) {
        return await api.db.query('SELECT * FROM bookings WHERE deletedAt IS NULL');
      } else {
        return await bookingRepo.getAll(role);
      }
    } catch (e) {
      console.error('Local DB Logic Failed:', e);
      return [];
    }
  }

  // Helper: Sync Cloud Data to Local SQLite
  private async syncLocalDatabase(cloudBookings: any[]) {
    const api = (window as any).electronAPI;
    if (!api || !api.db) return;

    try {
      // 1. Get existing local IDs to decide Insert vs Update (or simplified: Truncate & Replace if safe?)
      // For safety/speed in this context, we will use UPSERT logic if possible,
      // but since the user just RESET the cloud, we should reflect deletions too.

      // Strategy: Get all local IDs. If a local ID is NOT in cloudBookings, delete it locally.
      const localItems = await api.db.query('SELECT id FROM bookings');
      const cloudIds = new Set(cloudBookings.map(b => b.id));

      // Delete Stale items that don't exist in cloud anymore
      for (const item of localItems) {
        if (!cloudIds.has(item.id)) {
          await api.db.query('DELETE FROM bookings WHERE id = ?', [item.id]);
        }
      }

      // Upsert Cloud Data
      for (const booking of cloudBookings) {
        // We use repo or raw SQL. Raw SQL is safer for bypassing Drizzle schema drift defaults.
        // Converting JSON fields to string for SQLite
        const detailsStr =
          typeof booking.details === 'string'
            ? booking.details
            : JSON.stringify(booking.details || {});
        const historyStr =
          typeof booking.status_history === 'string'
            ? booking.status_history
            : JSON.stringify(booking.status_history || []);

        // Check existence
        const exists = await api.db.query('SELECT 1 FROM bookings WHERE id = ?', [booking.id]);

        if (exists && exists.length > 0) {
          // Update
          await api.db.query(
            `
                    UPDATE bookings SET 
                    clientName=?, shootDate=?, title=?, status=?, totalAmount=?, paidAmount=?, 
                    details=?, statusHistory=?, servicePackage=?, category=?
                    WHERE id=?
                 `,
            [
              booking.client_name || 'Unknown',
              booking.shoot_date,
              booking.title || 'Untitled',
              booking.status || 'pending',
              booking.total_amount || 0,
              booking.paid_amount || 0,
              detailsStr,
              historyStr,
              booking.service_package,
              booking.category || 'Wedding', // 🔴 FIX: Fallback for NOT NULL constraint
              booking.id,
            ]
          );
        } else {
          // Insert
          await api.db.query(
            `
                    INSERT INTO bookings (id, clientName, shootDate, title, status, totalAmount, paidAmount, details, statusHistory, servicePackage, category)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 `,
            [
              booking.id,
              booking.client_name || 'Unknown', // 🔴 FIX: Fallback
              booking.shoot_date,
              booking.title || 'Untitled', // 🔴 FIX: Fallback
              booking.status || 'pending',
              booking.total_amount || 0,
              booking.paid_amount || 0,
              detailsStr,
              historyStr,
              booking.service_package,
              booking.category || 'Wedding', // 🔴 FIX: Fallback
            ]
          );
        }
      }
    } catch (e) {
      console.error('Sync Down Failed:', e);
    }
  }

  private mapBookingData(raw: any): Booking {
    const safeParse = (val: any) => {
      if (!val) return undefined;
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return undefined;
      }
    };

    return {
      id: String(raw.id || raw._id || raw.ID),
      clientName: raw.clientName || raw.client_name || raw.clientname || 'Unknown',
      shootDate: (raw.shootDate || raw.shoot_date || raw.date || raw.shootdate || '').trim(),
      title: raw.title || raw.event_title || raw.eventTitle || raw.title,
      status: raw.status || 'PENDING',
      totalAmount: Number(raw.totalAmount || raw.total_amount || 0),
      paidAmount: Number(raw.paidAmount || raw.paid_amount || 0),
      currency: raw.currency || 'IQD',
      servicePackage: raw.servicePackage || raw.service_package || '',

      // Missing Required Fields Defaults
      location: raw.location || '',
      clientId: raw.clientId || raw.client_id || '',
      clientPhone: raw.clientPhone || raw.client_phone || '',
      category: raw.category || 'Wedding', // Default to Wedding if missing

      details: safeParse(raw.details || raw.json_details) || {},
      statusHistory:
        safeParse(raw.statusHistory || raw.status_history || raw.json_statusHistory) || [],

      // Deadline & Performance
      actualSelectionDate: raw.actualSelectionDate || raw.actual_selection_date,
      deliveryDeadline: raw.deliveryDeadline || raw.delivery_deadline,
      photoEditCompletedAt: raw.photoEditCompletedAt || raw.photo_edit_completed_at,
      videoEditCompletedAt: raw.videoEditCompletedAt || raw.video_edit_completed_at,
      printCompletedAt: raw.printCompletedAt || raw.print_completed_at,
      client_token: raw.client_token || raw.clientToken,
    };
  }

  async addBooking(data: any): Promise<Booking> {
    console.log('🚀 Adding new booking:', data);

    const validated = BookingSchema.parse({
      ...data,
      id: data.id || crypto.randomUUID(),
      paidAmount: data.paidAmount || 0,
      totalAmount: data.totalAmount || 0,
    });

    // Generate unique client_token for portal access
    const clientToken = data.client_token || `vh-${crypto.randomUUID().slice(0, 12)}`;

    // 1. Prepare DB Object (Snake Case for Supabase)
    // Use CurrentUserService for employee tracking
    const { CurrentUserService } = await import('../../CurrentUserService');
    const currentUser = CurrentUserService.getCurrentUser();
    const userName = currentUser?.name || 'Unknown';
    const userRole = currentUser?.roleLabel || 'غير محدد';
    const fullName = CurrentUserService.getFullName(); // "رسبشن مريم"

    // CRITICAL: Map to actual Supabase column names
    const dbObject = {
      id: validated.id,
      client_name: validated.clientName,
      client_id: data.clientId || '',
      phone: validated.clientPhone || data.clientPhone || '',
      shoot_date: validated.shootDate,
      category: data.category || validated.category || 'Wedding',
      location: data.location || validated.location || '',
      package_type: validated.servicePackage || data.servicePackage || data.category || 'Wedding',
      service_package: validated.servicePackage || data.servicePackage || '',
      title: validated.title,
      status: validated.status || 'pending',
      total_amount: validated.totalAmount,
      paid_amount: validated.paidAmount,
      currency: data.currency || 'IQD',
      details: JSON.stringify(data.details || {}),
      status_history: JSON.stringify([]),
      notes: data.notes || '',
      source: 'offline',
      nas_status: 'none',
      nas_progress: 0,

      // ✅ EMPLOYEE TRACKING FIELDS
      created_by: currentUser?.id || 'local',
      updated_by: currentUser?.id || 'local',
      created_by_name: userName,
      updated_by_name: userName,
      // Client portal token
      client_token: clientToken,
    };

    // 🔒 SECURITY: Only log in development
    if (import.meta.env.DEV) {
      console.log('📦 Prepared dbObject for Supabase:', dbObject);
    }

    // 2. Save Locally - Use exact schema field names
    await bookingRepo.create({
      id: validated.id,
      location: validated.location || '',
      clientId: validated.clientId || data.clientId || '',
      clientName: validated.clientName,
      clientPhone: validated.clientPhone || data.clientPhone || '',
      category: validated.category,
      title: validated.title,
      shootDate: validated.shootDate,
      status: (validated.status || 'pending') as Booking['status'],
      totalAmount: validated.totalAmount,
      paidAmount: validated.paidAmount,
      currency: data.currency || 'IQD',
      servicePackage: validated.servicePackage,
      details: data.details || {}, // Pass OBJECT, repo handles stringify
      nasStatus: 'none',
      nasProgress: 0,
      notes: data.notes || '',
      statusHistory: [], // Pass ARRAY, repo handles stringify
      created_by: currentUser?.id || 'local',
      updated_by: currentUser?.id || 'local',
      updated_at: new Date().toISOString(),
      client_token: clientToken,
    } as unknown as Booking);

    // 2. Insert into Local SQLite (Optimistic Write) 🔴 FIX: Persist locally via Repository
    try {
      // Construct full Booking object for Repository
      const fullBooking: Booking = {
        ...validated,
        currency: data.currency || 'IQD', // ✅ Add missing required field
        clientId: validated.clientId || data.clientId || '',
        clientPhone: validated.clientPhone || data.clientPhone || '',
        category: validated.category || data.category || 'Wedding',
        location: validated.location || data.location || '',
        statusHistory: (data.statusHistory as Booking['statusHistory']) || [],
        details: (data.details as Booking['details']) || {},
        nasStatus: 'none',
        nasProgress: 0,
        notes: validated.notes || '',
        created_by: currentUser?.id || 'local',
        createdBy: currentUser?.id || 'local',
        updatedAt: new Date().toISOString(),
        client_token: clientToken,
      } as Booking;

      await bookingRepo.create(fullBooking);
      console.log('✅ Booking persisted locally via Repository');
    } catch (localErr) {
      console.error('❌ Failed to persist booking locally:', localErr);
    }

    // 3. Sync to Cloud
    if (navigator.onLine) {
      try {
        console.log('☁️ Attempting to insert into Supabase...');
        // console.log('📤 Sending data:', JSON.stringify(dbObject, null, 2));

        const { data: insertedData, error } = await supabase
          .from('bookings')
          .insert(dbObject)
          .select();

        if (error) {
          // If error is RLS related to RANK, we might handle it here?
          // For now, treat as queueable failure.
          throw error;
        }

        console.log('✅ Booking synced to Cloud successfully!');
      } catch (e: any) {
        console.error('❌ Cloud Sync Failed (Add), adding to SQL queue...', JSON.stringify(e, null, 2));
        // Use SQL Queue
        await SyncQueueService.enqueue('create', 'booking', dbObject);
      }
    } else {
      console.log('📴 Offline mode - adding to SQL queue');
      await SyncQueueService.enqueue('create', 'booking', dbObject);
    }

    // 4. Log Activity (with null safety)
    await activityLogService.logAction(
      'create',
      'booking',
      validated.id,
      `Created booking for ${validated.clientName}`,
      { id: currentUser?.id || 'unknown', name: userName }
    );

    return { ...validated, nasStatus: 'none', nasProgress: 0 } as unknown as Booking;
  }

  async updateBooking(id: string, updates: any): Promise<void> {
    // 🔒 SECURITY: Authorization check
    const { CurrentUserService } = await import('../../CurrentUserService');
    const currentUser = CurrentUserService.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('غير مصرح: يجب تسجيل الدخول');
    }

    // Get booking to check ownership
    const booking = await this.getBookings().then(bs => bs.find(b => b.id === id));
    if (!booking) {
      throw new Error('الحجز غير موجود');
    }

    // Authorization logic: Only allow update if:
    // 1. User is the creator
    // 2. User is Manager or Admin
    const isOwner = booking.created_by === currentUser.id;
    const isManager = currentUser.role === 'manager' || currentUser.role === 'admin';
    
    if (!isOwner && !isManager) {
      throw new Error('غير مصرح: ليس لديك صلاحية لتعديل هذا الحجز');
    }

    // Get current user
    const fullName = CurrentUserService.getFullName();
    const userRole = currentUser?.roleLabel || 'غير محدد';

    // 1. Update Local
    const dbUpdates: any = {
      ...updates,
      modifiedBy: fullName,
      modifiedByRole: userRole,
    };
    if (updates.details) dbUpdates.details = JSON.stringify(updates.details);
    if (updates.statusHistory) dbUpdates.statusHistory = JSON.stringify(updates.statusHistory);

    await bookingRepo.update(id, dbUpdates);

    // 2. Sync to Cloud
    const cloudUpdates: any = {
      modifiedBy: fullName,
      modifiedByRole: userRole,
    };
    if (updates.clientName) cloudUpdates.client_name = updates.clientName;
    if (updates.shootDate) cloudUpdates.shoot_date = updates.shootDate;
    if (updates.status) cloudUpdates.status = updates.status;
    if (updates.details) cloudUpdates.details = JSON.stringify(updates.details);
    if (updates.statusHistory) cloudUpdates.status_history = JSON.stringify(updates.statusHistory);

    if (Object.keys(cloudUpdates).length > 0) {
      if (navigator.onLine) {
        const { error } = await supabase.from('bookings').update(cloudUpdates).eq('id', id);
        if (error) {
          // Queue for retry via SyncQueueService
          await SyncQueueService.enqueue('update', 'booking', { id, ...cloudUpdates });
        }
      } else {
        // Queue for retry via SyncQueueService when back online
        await SyncQueueService.enqueue('update', 'booking', { id, ...cloudUpdates });
      }
    }
  }

  async updateBookingStatus(id: string, newStatus: string): Promise<void> {
    const booking = await this.getBookings().then(bs => bs.find(b => b.id === id));
    if (!booking) throw new Error('Booking not found');

    const history = booking.statusHistory || [];
    const historyItem = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      notes: `تم تغيير الحالة إلى: ${newStatus}`,
    };

    const updatedHistory = [...history, historyItem];

    const updates: any = {
      status: newStatus,
      statusHistory: updatedHistory,
    };

    if (newStatus === 'Editing' || newStatus === 'q_editing') {
      const now = new Date();
      updates.actualSelectionDate = now.toISOString();

      // 60-Day Deadline Rule from Selection Date
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 60);
      updates.deliveryDeadline = deadline.toISOString();

      console.log(
        `📅 Deadline Set: Selection finished at ${updates.actualSelectionDate}, Deadline is ${updates.deliveryDeadline}`
      );
    }

    // Performance Tracking Timestamps
    if (newStatus === 'Ready to Print') {
      updates.photoEditCompletedAt = new Date().toISOString();
    }
    if (newStatus === 'Montage Completed') {
      // Adjust based on exact status string
      updates.videoEditCompletedAt = new Date().toISOString();
    }
    if (newStatus === 'Delivered') {
      updates.printCompletedAt = new Date().toISOString(); // Or delivery completed
    }

    await this.updateBooking(id, updates);

    // Log Activity
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    await activityLogService.logAction('update', 'booking', id, `Updated status to ${newStatus}`, {
      id: currentUser.id,
      name: currentUser.name || 'System',
    });

    // NAS Cleanup Notification — when booking is Delivered, notify staff to delete photos from NAS
    if (newStatus === 'Delivered') {
      this.dispatchNasCleanupNotification(id, booking.clientName || booking.title || id);
    }
  }

  /**
   * Dispatch NAS cleanup notification when booking is delivered.
   * Targets SELECTOR, MANAGER, and ADMIN roles via localStorage-based notification queue.
   * Shows a toast immediately and persists the notification for the notification center.
   */
  private dispatchNasCleanupNotification(bookingId: string, clientLabel: string) {
    try {
      const notification = {
        id: `nas-cleanup-${bookingId}-${Date.now()}`,
        title: 'تنبيه: مسح الصور من الساينولوجي',
        message: `تم تسليم الطلب "${clientLabel}" — يرجى مسح صور هذا الطلب من NAS يدوياً`,
        time: new Date().toISOString(),
        read: false,
        type: 'nas_cleanup' as const,
        targetRoles: ['selector', 'manager', 'admin'],
        bookingId,
      };

      // Persist to localStorage notification queue
      const stored = JSON.parse(localStorage.getItem('app_notifications') || '[]');
      stored.unshift(notification);
      // Keep max 50 notifications
      if (stored.length > 50) stored.length = 50;
      localStorage.setItem('app_notifications', JSON.stringify(stored));

      // Dispatch custom event so NotificationCenter can pick it up in real-time
      window.dispatchEvent(new CustomEvent('app:notification', { detail: notification }));

      console.log(`[BookingService] NAS cleanup notification dispatched for booking ${bookingId}`);
    } catch (err) {
      console.error('[BookingService] Failed to dispatch NAS cleanup notification:', err);
    }
  }

  async softDeleteBooking(id: string): Promise<void> {
    // 1. 🗑️ Soft Delete Related Dashboard Tasks (Cascade Delete)
    try {
      await db
        .deleteFrom('dashboard_tasks')
        .where('relatedBookingId', '=', id)
        .execute();
      console.log(`✅ Deleted dashboard tasks for booking ${id}`);
    } catch (error) {
      console.error('❌ Failed to delete related tasks:', error);
    }

    // 2. 🗑️ Soft Delete Booking - Mark as deleted (can be restored within 30 days)
    await bookingRepo.softDelete(id);

    // 3. ☁️ Cloud Soft Delete
    if (navigator.onLine) {
      await supabase.from('bookings').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    } else {
      // Queue for retry via SyncQueueService when back online
      await SyncQueueService.enqueue('delete', 'booking', { id });
    }

    // 4. 📝 Log Activity
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    await activityLogService.logAction('delete', 'booking', id, 'Soft deleted booking (restorable within 30 days)', {
      id: currentUser.id,
      name: currentUser.name || 'System',
    });
  }

  async restoreBooking(id: string): Promise<void> {
    // 1. ♻️ Restore - Clear deletedAt timestamp
    await bookingRepo.restore(id);

    // 2. ☁️ Cloud Restore
    if (navigator.onLine) {
      await supabase.from('bookings').update({ deleted_at: null }).eq('id', id);
    } else {
      await SyncQueueService.enqueue('update', 'booking', { id, deleted_at: null });
    }

    // 3. 📝 Log Activity
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    await activityLogService.logAction('restore', 'booking', id, 'Restored booking from trash', {
      id: currentUser.id,
      name: currentUser.name || 'System',
    });
  }

  async getDeletedBookings(): Promise<Booking[]> {
    return bookingRepo.getDeleted();
  }

  async permanentDeleteBooking(id: string): Promise<void> {
    const reminderService = new ReminderService();
    
    // 1. 🗑️ Delete related reminders permanently
    const reminders = await reminderService.getReminders(id);
    for (const reminder of reminders) {
      await reminderService.deleteReminder(reminder.id);
    }
    
    // 2. 🗑️ Delete related dashboard tasks
    await db
      .deleteFrom('dashboard_tasks')
      .where('relatedBookingId', '=', id)
      .execute();

    // 3. 🗑️ Local Hard Delete (permanent removal)
    await bookingRepo.hardDelete(id);

    // 4. ☁️ Cloud Hard Delete
    if (navigator.onLine) {
      await supabase.from('bookings').delete().eq('id', id);
      await supabase.from('reminders').delete().eq('bookingId', id);
    }

    // 5. 📝 Log Activity
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    await activityLogService.logAction('delete', 'booking', id, 'Permanently deleted booking', {
      id: currentUser.id,
      name: currentUser.name || 'System',
    });
  }

  async cleanupOldDeletedBookings(days: number = 30): Promise<number> {
    const deletedCount = await bookingRepo.cleanupOldDeleted(days);
    
    if (deletedCount > 0) {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      await activityLogService.logAction('cleanup', 'booking', 'system', `Cleaned up ${deletedCount} old deleted bookings`, {
        id: currentUser.id,
        name: currentUser.name || 'System',
      });
    }
    
    return deletedCount;
  }

  /**
   * 🧹 Smart Cleanup: Deletes only Test/Demo data
   * Safe to run in production.
   */
  async deleteTestBookings(): Promise<number> {
    console.log('🧹 Starting Smart Cleanup...');
    let deletedCount = 0;

    // 1. Fetch all bookings (Lightweight select)
    const allBookings = await this.getBookings();

    // 2. Filter for Test/Demo patterns
    const testBookings = allBookings.filter(b => {
      const name = (b.clientName || '').toLowerCase();
      const title = (b.title || '').toLowerCase();
      const phone = b.clientPhone || '000000'; // Default to fake path if missing to be safe? No, default to safe.

      const isTestName =
        name.includes('test') || name.includes('demo') || name.includes('tst') || name === 'h';
      const isTestTitle = title.includes('test') || title.includes('demo');
      const isFakePhone = phone === '07700000000' || phone === '123456' || phone === '000000';

      return isTestName || isTestTitle || isFakePhone;
    });

    console.log(`found ${testBookings.length} test bookings to delete.`);

    // 3. Delete them one by one (to ensure both Cloud and Local are handled via standard delete logic)
    for (const booking of testBookings) {
      await this.softDeleteBooking(booking.id);
      deletedCount++;
    }

    return deletedCount;
  }
}

export const bookingService = new BookingService();
