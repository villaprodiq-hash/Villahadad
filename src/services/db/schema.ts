import { db } from './index';

export async function initDB() {
  console.log('🔧 [initDB] Starting database schema initialization...');
  const startTime = Date.now();

  try {
    // Users Table
    await db.schema
      .createTable('users')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('name', 'text', col => col.notNull())
      .addColumn('role', 'text', col => col.notNull())
      .addColumn('avatar', 'text')
      .addColumn('password', 'text')
      .addColumn('email', 'text')
      .addColumn('jobTitle', 'text')
      .addColumn('preferences', 'text')
      .addColumn('deletedAt', 'integer')
      .execute();

    // Bookings Table
    await db.schema
      .createTable('bookings')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('location', 'text')
      .addColumn('clientId', 'text')
      .addColumn('clientName', 'text', col => col.notNull())
      .addColumn('clientPhone', 'text')
      .addColumn('category', 'text', col => col.notNull())
      .addColumn('title', 'text', col => col.notNull())
      .addColumn('shootDate', 'text')
      .addColumn('status', 'text', col => col.notNull())
      .addColumn('totalAmount', 'real', col => col.notNull().defaultTo(0))
      .addColumn('paidAmount', 'real', col => col.notNull().defaultTo(0))
      .addColumn('currency', 'text', col => col.notNull().defaultTo('IQD'))
      .addColumn('servicePackage', 'text')
      .addColumn('details', 'text')
      .addColumn('nasStatus', 'text', col => col.defaultTo('none'))
      .addColumn('nasProgress', 'integer', col => col.defaultTo(0))
      .addColumn('notes', 'text')
      .addColumn('assignedShooter', 'text')
      .addColumn('assignedPhotoEditor', 'text')
      .addColumn('assignedPrinter', 'text')
      .addColumn('assignedReceptionist', 'text')
      .addColumn('statusHistory', 'text')
      .addColumn('createdBy', 'text')
      .addColumn('updatedBy', 'text')
      .addColumn('updatedAt', 'text')
      .addColumn('deletedAt', 'integer')
      .addColumn('actualSelectionDate', 'text')
      .addColumn('deliveryDeadline', 'text')
      .addColumn('photoEditCompletedAt', 'text')
      .addColumn('videoEditCompletedAt', 'text')
      .addColumn('printCompletedAt', 'text')
      .addColumn('paymentReceivedBy', 'text')
      .addColumn('paymentReceivedAt', 'text')
      // 🌑 BLACK'S COMMITMENT & CREW FIELDS
      .addColumn('isPriority', 'integer', col => col.defaultTo(0))
      .addColumn('isCrewShooting', 'integer', col => col.defaultTo(0))
      // Add-on fields
      .addColumn('originalPackagePrice', 'real')
      .addColumn('addOnTotal', 'real', col => col.defaultTo(0))
      .addColumn('paymentHistory', 'text')
      .addColumn('invoiceHistory', 'text')
      // Exchange rate for multi-currency support
      .addColumn('exchangeRate', 'real')
      // Client portal token for remote photo selection
      .addColumn('client_token', 'text')
      .execute();

    // Payments Table
    await db.schema
      .createTable('payments')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('bookingId', 'text', col =>
        col.notNull().references('bookings.id').onDelete('cascade')
      )
      .addColumn('amount', 'real', col => col.notNull())
      .addColumn('date', 'text', col => col.notNull())
      .addColumn('method', 'text', col => col.notNull())
      .addColumn('collectedBy', 'text', col => col.notNull())
      .addColumn('notes', 'text')
      .addColumn('deletedAt', 'integer')
      // Extended fields for add-on support
      .addColumn('currency', 'text')
      .addColumn('exchangeRate', 'real')
      .addColumn('convertedAmount', 'real')
      .addColumn('type', 'text')
      .addColumn('relatedAddOnId', 'text')
      .execute();

    // Reminders Table
    await db.schema
      .createTable('reminders')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('bookingId', 'text', col => col.references('bookings.id').onDelete('cascade'))
      .addColumn('title', 'text', col => col.notNull())
      .addColumn('dueDate', 'text', col => col.notNull())
      .addColumn('completed', 'integer', col => col.notNull().defaultTo(0))
      .addColumn('type', 'text', col => col.notNull().defaultTo('general'))
      .addColumn('customIcon', 'text')
      .addColumn('deletedAt', 'integer')
      .execute();

    // Dashboard Tasks Table
    await db.schema
      .createTable('dashboard_tasks')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('title', 'text', col => col.notNull())
      .addColumn('time', 'text')
      .addColumn('createdAt', 'text')
      .addColumn('completed', 'integer', col => col.notNull().defaultTo(0))
      .addColumn('type', 'text', col => col.notNull().defaultTo('general'))
      .addColumn('source', 'text', col => col.defaultTo('manual'))
      .addColumn('relatedBookingId', 'text')  // No FK - bookings may only exist in Supabase
      .addColumn('priority', 'text', col => col.defaultTo('normal'))
      .addColumn('deletedAt', 'integer')
      .execute();

    // Sync Queue Table
    await db.schema
      .createTable('sync_queue')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('action', 'text', col => col.notNull())
      .addColumn('entity', 'text', col => col.notNull())
      .addColumn('data', 'text', col => col.notNull())
      .addColumn('status', 'text', col => col.defaultTo('pending'))
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('retryCount', 'integer', col => col.defaultTo(0))
      .execute();

    // Leaves Table
    await db.schema
      .createTable('leaves')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('userId', 'text', col => col.notNull())
      .addColumn('userName', 'text', col => col.notNull())
      .addColumn('startDate', 'text', col => col.notNull())
      .addColumn('endDate', 'text', col => col.notNull())
      .addColumn('type', 'text', col => col.notNull())
      .addColumn('reason', 'text')
      .addColumn('status', 'text', col => col.notNull().defaultTo('Pending'))
      .addColumn('approvedBy', 'text')
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text', col => col.notNull())
      .addColumn('deletedAt', 'text')
      .execute();

    // Activity Logs Table
    await db.schema
      .createTable('activity_logs')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('userId', 'text', col => col.notNull())
      .addColumn('userName', 'text', col => col.notNull())
      .addColumn('action', 'text', col => col.notNull())
      .addColumn('entityType', 'text', col => col.notNull())
      .addColumn('entityId', 'text')
      .addColumn('details', 'text')
      .addColumn('createdAt', 'text', col => col.notNull())
      .execute();

    // Daily Attendance Table
    await db.schema
      .createTable('daily_attendance')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('userId', 'text', col => col.notNull())
      .addColumn('userName', 'text', col => col.notNull())
      .addColumn('date', 'text', col => col.notNull())
      .addColumn('checkIn', 'text')
      .addColumn('checkOut', 'text')
      .addColumn('status', 'text', col => col.notNull().defaultTo('Absent'))
      .addColumn('totalHours', 'real', col => col.defaultTo(0))
      .addColumn('isFrozen', 'integer', col => col.defaultTo(0))
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text', col => col.notNull())
      .execute();

    // Messages Table
    await db.schema
      .createTable('messages')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('content', 'text', col => col.notNull())
      .addColumn('senderId', 'text', col => col.notNull())
      .addColumn('senderName', 'text', col => col.notNull())
      .addColumn('senderRole', 'text', col => col.notNull())
      .addColumn('recipientId', 'text')
      .addColumn('type', 'text', col => col.notNull().defaultTo('text'))
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('isRead', 'integer', col => col.defaultTo(0))
      .execute();

    // Packages Table
    await db.schema
      .createTable('packages')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('category', 'text', col => col.notNull())
      .addColumn('name', 'text', col => col.notNull())
      .addColumn('basePrice', 'real', col => col.notNull())
      .addColumn('currentPrice', 'real', col => col.notNull())
      .addColumn('currency', 'text', col => col.notNull().defaultTo('IQD'))
      .addColumn('discountType', 'text')
      .addColumn('discountValue', 'real')
      .addColumn('discountStart', 'text')
      .addColumn('discountEnd', 'text')
      .addColumn('isCustom', 'integer', col => col.defaultTo(0))
      .addColumn('isActive', 'integer', col => col.defaultTo(1))
      .addColumn('isBestseller', 'integer', col => col.defaultTo(0))
      .addColumn('features', 'text')
      .addColumn('details', 'text')
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text', col => col.notNull())
      .addColumn('deletedAt', 'integer')
      .execute();

    // Discount Codes Table (manager-controlled campaign codes)
    await db.schema
      .createTable('discount_codes')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('code', 'text', col => col.notNull())
      .addColumn('type', 'text', col => col.notNull()) // 'percentage' | 'fixed'
      .addColumn('value', 'real', col => col.notNull())
      .addColumn('startAt', 'text', col => col.notNull()) // ISO datetime
      .addColumn('endAt', 'text') // null = no expiry
      .addColumn('isActive', 'integer', col => col.notNull().defaultTo(1))
      .addColumn('isPublished', 'integer', col => col.notNull().defaultTo(0))
      .addColumn('createdBy', 'text', col => col.notNull())
      .addColumn('createdByName', 'text', col => col.notNull())
      .addColumn('notes', 'text')
      .addColumn('usageCount', 'integer', col => col.notNull().defaultTo(0))
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text', col => col.notNull())
      .addColumn('deletedAt', 'integer')
      .execute();

    await db.schema
      .createIndex('idx_discount_codes_code')
      .ifNotExists()
      .on('discount_codes')
      .column('code')
      .execute();

    await db.schema
      .createIndex('idx_discount_codes_active')
      .ifNotExists()
      .on('discount_codes')
      .column('isActive')
      .execute();

    // Discount redemptions audit table
    await db.schema
      .createTable('discount_redemptions')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('discountCodeId', 'text', col => col.notNull())
      .addColumn('bookingId', 'text', col => col.notNull())
      .addColumn('code', 'text', col => col.notNull())
      .addColumn('type', 'text', col => col.notNull()) // 'percentage' | 'fixed'
      .addColumn('value', 'real', col => col.notNull())
      .addColumn('discountAmount', 'real', col => col.notNull())
      .addColumn('subtotalAmount', 'real', col => col.notNull())
      .addColumn('finalAmount', 'real', col => col.notNull())
      .addColumn('reason', 'text')
      .addColumn('appliedBy', 'text', col => col.notNull())
      .addColumn('appliedByName', 'text', col => col.notNull())
      .addColumn('appliedAt', 'text', col => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_discount_redemptions_booking')
      .ifNotExists()
      .on('discount_redemptions')
      .column('bookingId')
      .execute();

    await db.schema
      .createIndex('idx_discount_redemptions_code')
      .ifNotExists()
      .on('discount_redemptions')
      .column('discountCodeId')
      .execute();

    // Add-Ons Table
    await db.schema
      .createTable('add_ons')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('bookingId', 'text', col =>
        col.notNull().references('bookings.id').onDelete('cascade')
      )
      .addColumn('category', 'text', col => col.notNull())
      .addColumn('description', 'text', col => col.notNull())
      .addColumn('amount', 'real', col => col.notNull())
      .addColumn('currency', 'text', col => col.notNull().defaultTo('IQD'))
      .addColumn('exchangeRate', 'real', col => col.notNull())
      .addColumn('convertedAmount', 'real', col => col.notNull())
      .addColumn('status', 'text', col => col.notNull().defaultTo('pending'))
      .addColumn('requestedBy', 'text', col => col.notNull())
      .addColumn('requestedByName', 'text', col => col.notNull())
      .addColumn('requestedAt', 'text', col => col.notNull())
      .addColumn('approvedBy', 'text')
      .addColumn('approvedByName', 'text')
      .addColumn('approvedAt', 'text')
      .addColumn('originalPackagePrice', 'real', col => col.notNull())
      .addColumn('previousTotal', 'real', col => col.notNull())
      .addColumn('newTotal', 'real', col => col.notNull())
      .addColumn('customerNotifiedAt', 'text')
      .addColumn('notificationMethod', 'text')
      .addColumn('invoiceId', 'text')
      .addColumn('invoicedAt', 'text')
      .addColumn('paymentRecordId', 'text')
      .addColumn('paidAt', 'text')
      .addColumn('notes', 'text')
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text', col => col.notNull())
      .addColumn('deletedAt', 'integer')
      .execute();

    // Add-On Audit Table
    await db.schema
      .createTable('add_on_audit')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('addOnId', 'text', col => col.notNull())
      .addColumn('bookingId', 'text', col => col.notNull())
      .addColumn('action', 'text', col => col.notNull())
      .addColumn('performedBy', 'text', col => col.notNull())
      .addColumn('performedByName', 'text', col => col.notNull())
      .addColumn('performedAt', 'text', col => col.notNull())
      .addColumn('details', 'text', col => col.notNull())
      .addColumn('oldValues', 'text')
      .addColumn('newValues', 'text')
      .execute();

    // Create indexes for add-ons
    await db.schema
      .createIndex('idx_add_ons_booking_id')
      .ifNotExists()
      .on('add_ons')
      .column('bookingId')
      .execute();

    await db.schema
      .createIndex('idx_add_ons_status')
      .ifNotExists()
      .on('add_ons')
      .column('status')
      .execute();

    await db.schema
      .createIndex('idx_add_on_audit_add_on_id')
      .ifNotExists()
      .on('add_on_audit')
      .column('addOnId')
      .execute();

    await db.schema
      .createIndex('idx_add_on_audit_booking_id')
      .ifNotExists()
      .on('add_on_audit')
      .column('bookingId')
      .execute();

    // Client Transactions Table (for credit additions/deductions)
    await db.schema
      .createTable('client_transactions')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('clientId', 'text', col => col.notNull())
      .addColumn('bookingId', 'text')
      .addColumn('amount', 'real', col => col.notNull())
      .addColumn('currency', 'text', col => col.notNull().defaultTo('IQD'))
      .addColumn('type', 'text', col => col.notNull()) // 'credit_addition', 'credit_deduction', 'refund', 'adjustment'
      .addColumn('note', 'text', col => col.notNull())
      .addColumn('status', 'text', col => col.notNull().defaultTo('active')) // 'active', 'reversed', 'pending'
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text', col => col.notNull())
      .addColumn('createdBy', 'text', col => col.notNull())
      .addColumn('createdByName', 'text', col => col.notNull())
      .addColumn('canReverseUntil', 'text', col => col.notNull()) // 5 minutes from creation
      .addColumn('reversedAt', 'text')
      .addColumn('reversedBy', 'text')
      .addColumn('reversedByName', 'text')
      .addColumn('reversalReason', 'text')
      .addColumn('balanceAfter', 'real', col => col.notNull())
      .execute();

    // Create indexes for client transactions
    await db.schema
      .createIndex('idx_client_transactions_client_id')
      .ifNotExists()
      .on('client_transactions')
      .column('clientId')
      .execute();

    await db.schema
      .createIndex('idx_client_transactions_booking_id')
      .ifNotExists()
      .on('client_transactions')
      .column('bookingId')
      .execute();

    await db.schema
      .createIndex('idx_client_transactions_status')
      .ifNotExists()
      .on('client_transactions')
      .column('status')
      .execute();

    await db.schema
      .createIndex('idx_client_transactions_created_at')
      .ifNotExists()
      .on('client_transactions')
      .column('createdAt')
      .execute();

    // Session Images Table (for Photo Selection Workflow)
    await db.schema
      .createTable('session_images')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('sessionId', 'text', col => col.notNull()) // Same as bookingId
      .addColumn('bookingId', 'text', col => col.references('bookings.id').onDelete('cascade'))
      .addColumn('fileName', 'text', col => col.notNull())
      .addColumn('originalPath', 'text') // Local NAS path
      .addColumn('cloudUrl', 'text') // Cloudflare R2 URL
      .addColumn('thumbnailUrl', 'text') // Small preview
      .addColumn('status', 'text', col => col.notNull().defaultTo('pending')) // 'pending', 'selected', 'rejected', 'editing', 'final'
      .addColumn('selectedBy', 'text') // 'client', 'selector', 'designer'
      .addColumn('selectedAt', 'text')
      .addColumn('liked', 'integer', col => col.defaultTo(0)) // Heart/like
      .addColumn('notes', 'text') // Client or selector notes
      .addColumn('sortOrder', 'integer', col => col.defaultTo(0))
      .addColumn('uploadedAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text')
      .addColumn('syncedToCloud', 'integer', col => col.defaultTo(0))
      .execute();

    // Create indexes for session images
    await db.schema
      .createIndex('idx_session_images_session_id')
      .ifNotExists()
      .on('session_images')
      .column('sessionId')
      .execute();

    await db.schema
      .createIndex('idx_session_images_booking_id')
      .ifNotExists()
      .on('session_images')
      .column('bookingId')
      .execute();

    await db.schema
      .createIndex('idx_session_images_status')
      .ifNotExists()
      .on('session_images')
      .column('status')
      .execute();

    await db.schema
      .createIndex('idx_session_images_selected')
      .ifNotExists()
      .on('session_images')
      .column('liked')
      .execute();

    // Sessions Table (for session lifecycle tracking)
    await db.schema
      .createTable('sessions')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('bookingId', 'text', col => col.references('bookings.id').onDelete('cascade'))
      .addColumn('clientName', 'text', col => col.notNull())
      .addColumn('nasPath', 'text') // Root folder on NAS
      .addColumn('cloudGalleryUrl', 'text') // Public gallery URL
      .addColumn('status', 'text', col => col.notNull().defaultTo('ingesting')) // 'ingesting', 'selecting', 'editing', 'printing', 'completed'
      .addColumn('totalImages', 'integer', col => col.defaultTo(0))
      .addColumn('selectedImages', 'integer', col => col.defaultTo(0))
      .addColumn('uploadProgress', 'integer', col => col.defaultTo(0))
      .addColumn('selectionMethod', 'text', col => col.defaultTo('studio')) // 'studio', 'remote', 'hybrid'
      .addColumn('selectionConfirmedAt', 'text') // When client confirmed selection
      .addColumn('r2CleanupAfter', 'text') // 45 days after confirmation
      .addColumn('r2Cleaned', 'integer', col => col.defaultTo(0)) // 1 = R2 files deleted
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text')
      .addColumn('completedAt', 'text')
      .execute();

    // 🌑 [BLACK'S ADDITION] Inventory & Equipment Tables
    await db.schema
      .createTable('inventory')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('name', 'text', col => col.notNull())
      .addColumn('type', 'text', col => col.notNull()) // 'camera', 'lens', 'flash', 'battery', etc.
      .addColumn('icon', 'text')
      .addColumn('status', 'text', col => col.defaultTo('storage')) // 'storage', 'deployed', 'maintenance', 'lost'
      .addColumn('assignedTo', 'text') // userId
      .addColumn('batteryCharged', 'integer') // 0 to total
      .addColumn('batteryTotal', 'integer')
      .addColumn('memoryFree', 'integer')
      .addColumn('memoryTotal', 'integer')
      .addColumn('notes', 'text')
      .addColumn('createdAt', 'text', col => col.notNull())
      .addColumn('updatedAt', 'text')
      .execute();

    await db.schema
      .createTable('inventory_logs')
      .ifNotExists()
      .addColumn('id', 'text', col => col.primaryKey())
      .addColumn('itemId', 'text', col => col.notNull())
      .addColumn('action', 'text', col => col.notNull()) // 'assigned', 'returned', 'battery_charge', etc.
      .addColumn('userId', 'text', col => col.notNull())
      .addColumn('details', 'text')
      .addColumn('createdAt', 'text', col => col.notNull())
      .execute();

    await db.schema
      .createIndex('idx_inventory_assigned_to')
      .ifNotExists()
      .on('inventory')
      .column('assignedTo')
      .execute();

    await db.schema
      .createIndex('idx_sessions_booking_id')
      .ifNotExists()
      .on('sessions')
      .column('bookingId')
      .execute();

    await db.schema
      .createIndex('idx_sessions_status')
      .ifNotExists()
      .on('sessions')
      .column('status')
      .execute();

    console.log(
      `✅ [initDB] Database Schema Initialized Successfully (${Date.now() - startTime}ms)`
    );

    // 🔄 Run migrations for existing databases
    await runMigrations();
  } catch (error) {
    console.error('❌ [initDB] Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * 🔄 Database Migrations
 * Add new columns to existing tables without dropping data
 */
async function runMigrations() {
  try {
    console.log('🔄 [Migration] Running database migrations...');

    // Use direct IPC API for raw SQL (Kysely's executeQuery needs CompiledQuery shape)
    const api = window.electronAPI;
    if (!api?.db) {
      console.log('⚠️ [Migration] No Electron API available, skipping migrations');
      return;
    }

    // Migration 1: Add exchangeRate column to bookings if missing
    try {
      const result = await api.db.query(
        `SELECT COUNT(*) as count FROM pragma_table_info('bookings') WHERE name = 'exchangeRate'`
      );
      const firstRow = result[0];
      const rawCount =
        typeof firstRow === 'object' && firstRow !== null && 'count' in firstRow
          ? (firstRow as { count?: unknown }).count
          : 0;
      const count =
        typeof rawCount === 'number'
          ? rawCount
          : typeof rawCount === 'string'
            ? Number(rawCount)
            : 0;
      const hasColumn = count > 0;

      if (!hasColumn) {
        console.log('🔄 [Migration] Adding exchangeRate column to bookings table...');
        await api.db.run('ALTER TABLE bookings ADD COLUMN exchangeRate REAL');
        console.log('✅ [Migration] exchangeRate column added successfully');
      } else {
        console.log('✅ [Migration] exchangeRate column already exists');
      }
    } catch (e) {
      console.warn('⚠️ [Migration] exchangeRate migration failed:', e);
    }

    // Migration 2: session_images compatibility for fileName/file_name naming
    try {
      const columnsResult = await api.db.query(`PRAGMA table_info('session_images')`);
      const columnNames = new Set(
        (Array.isArray(columnsResult) ? columnsResult : [])
          .map((row) => (typeof row === 'object' && row !== null && 'name' in row ? String((row as { name?: unknown }).name || '').trim() : ''))
          .filter((name) => name.length > 0)
      );

      const hasCamel = columnNames.has('fileName');
      const hasSnake = columnNames.has('file_name');

      if (hasCamel && !hasSnake) {
        await api.db.run('ALTER TABLE session_images ADD COLUMN file_name TEXT');
        await api.db.run("UPDATE session_images SET file_name = fileName WHERE file_name IS NULL OR TRIM(file_name) = ''");
        console.log('✅ [Migration] Added session_images.file_name compatibility column');
      } else if (!hasCamel && hasSnake) {
        await api.db.run('ALTER TABLE session_images ADD COLUMN fileName TEXT');
        await api.db.run("UPDATE session_images SET fileName = file_name WHERE fileName IS NULL OR TRIM(fileName) = ''");
        console.log('✅ [Migration] Added session_images.fileName compatibility column');
      } else if (hasCamel && hasSnake) {
        await api.db.run("UPDATE session_images SET file_name = COALESCE(NULLIF(file_name, ''), fileName)");
        await api.db.run("UPDATE session_images SET fileName = COALESCE(NULLIF(fileName, ''), file_name)");
      }
    } catch (e) {
      console.warn('⚠️ [Migration] session_images file name compatibility migration failed:', e);
    }

    // Migration 3: Disable FOREIGN KEY enforcement
    // The FK on dashboard_tasks.relatedBookingId causes failures because bookings
    // often only exist in Supabase, not local SQLite. Disable FK enforcement globally.
    try {
      await api.db.run('PRAGMA foreign_keys = OFF');
      console.log('✅ [Migration] Foreign key enforcement disabled');
    } catch (e) {
      console.warn('⚠️ [Migration] Failed to disable FK enforcement:', e);
    }

    console.log('✅ [Migration] All migrations completed');
  } catch (error) {
    console.warn('⚠️ [Migration] Failed to run migrations:', error);
    // Don't throw - migrations are optional
  }
}

export interface ConflictRecord {
  id: string;
  entityId: string;
  localData: unknown;
  serverData: unknown;
  resolved: boolean;
  resolution?: 'local' | 'server';
  timestamp: number;
  // DB specific fields (optional/legacy)
  table?: string;
  recordId?: string;
  remoteData?: unknown;
  status?: 'pending' | 'resolved' | 'ignored';
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt?: string;
}
