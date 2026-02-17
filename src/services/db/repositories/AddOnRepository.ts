import { db } from '../index';
import { AddOnItem, AddOnAuditEntry } from '../../../types/addon.types';
import { safeJsonParse } from '../../../utils/safeJson';

/**
 * Add-On Repository
 * Handles database operations for add-ons and audit trails
 */
export const AddOnRepository = {
  /**
   * Get all add-ons for a booking
   */
  async getByBookingId(bookingId: string): Promise<AddOnItem[]> {
    const rows = await db
      .selectFrom('add_ons')
      .selectAll()
      .where('bookingId', '=', bookingId)
      .where('deletedAt', 'is', null)
      .orderBy('createdAt', 'desc')
      .execute();

    return rows.map(row => ({
      ...row,
      amount: Number(row.amount),
      exchangeRate: Number(row.exchangeRate),
      convertedAmount: Number(row.convertedAmount),
      originalPackagePrice: Number(row.originalPackagePrice),
      previousTotal: Number(row.previousTotal),
      newTotal: Number(row.newTotal),
    })) as AddOnItem[];
  },

  /**
   * Get a single add-on by ID
   */
  async getById(id: string): Promise<AddOnItem | null> {
    const row = await db
      .selectFrom('add_ons')
      .selectAll()
      .where('id', '=', id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    if (!row) return null;

    return {
      ...row,
      amount: Number(row.amount),
      exchangeRate: Number(row.exchangeRate),
      convertedAmount: Number(row.convertedAmount),
      originalPackagePrice: Number(row.originalPackagePrice),
      previousTotal: Number(row.previousTotal),
      newTotal: Number(row.newTotal),
    } as AddOnItem;
  },

  /**
   * Get multiple add-ons by IDs
   */
  async getByIds(ids: string[]): Promise<AddOnItem[]> {
    const rows = await db
      .selectFrom('add_ons')
      .selectAll()
      .where('id', 'in', ids)
      .where('deletedAt', 'is', null)
      .execute();

    return rows.map(row => ({
      ...row,
      amount: Number(row.amount),
      exchangeRate: Number(row.exchangeRate),
      convertedAmount: Number(row.convertedAmount),
      originalPackagePrice: Number(row.originalPackagePrice),
      previousTotal: Number(row.previousTotal),
      newTotal: Number(row.newTotal),
    })) as AddOnItem[];
  },

  /**
   * Get pending add-ons for a booking
   */
  async getPendingByBookingId(bookingId: string): Promise<AddOnItem[]> {
    const rows = await db
      .selectFrom('add_ons')
      .selectAll()
      .where('bookingId', '=', bookingId)
      .where('status', '=', 'pending')
      .where('deletedAt', 'is', null)
      .execute();

    return rows.map(row => ({
      ...row,
      amount: Number(row.amount),
      exchangeRate: Number(row.exchangeRate),
      convertedAmount: Number(row.convertedAmount),
      originalPackagePrice: Number(row.originalPackagePrice),
      previousTotal: Number(row.previousTotal),
      newTotal: Number(row.newTotal),
    })) as AddOnItem[];
  },

  /**
   * Create a new add-on
   */
  async create(addOn: AddOnItem): Promise<void> {
    await db
      .insertInto('add_ons')
      .values({
        id: addOn.id,
        bookingId: addOn.bookingId,
        category: addOn.category,
        description: addOn.description,
        amount: addOn.amount,
        currency: addOn.currency,
        exchangeRate: addOn.exchangeRate,
        convertedAmount: addOn.convertedAmount,
        status: addOn.status,
        requestedBy: addOn.requestedBy,
        requestedByName: addOn.requestedByName,
        requestedAt: addOn.requestedAt,
        approvedBy: addOn.approvedBy || null,
        approvedByName: addOn.approvedByName || null,
        approvedAt: addOn.approvedAt || null,
        originalPackagePrice: addOn.originalPackagePrice,
        previousTotal: addOn.previousTotal,
        newTotal: addOn.newTotal,
        customerNotifiedAt: addOn.customerNotifiedAt || null,
        notificationMethod: addOn.notificationMethod || null,
        invoiceId: addOn.invoiceId || null,
        invoicedAt: addOn.invoicedAt || null,
        paymentRecordId: addOn.paymentRecordId || null,
        paidAt: addOn.paidAt || null,
        notes: addOn.notes || null,
        createdAt: addOn.createdAt,
        updatedAt: addOn.updatedAt,
        deletedAt: null,
      })
      .execute();
  },

  /**
   * Update an add-on
   */
  async update(id: string, updates: Partial<AddOnItem>): Promise<void> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.approvedBy !== undefined) updateData.approvedBy = updates.approvedBy;
    if (updates.approvedByName !== undefined) updateData.approvedByName = updates.approvedByName;
    if (updates.approvedAt !== undefined) updateData.approvedAt = updates.approvedAt;
    if (updates.customerNotifiedAt !== undefined) updateData.customerNotifiedAt = updates.customerNotifiedAt;
    if (updates.notificationMethod !== undefined) updateData.notificationMethod = updates.notificationMethod;
    if (updates.invoiceId !== undefined) updateData.invoiceId = updates.invoiceId;
    if (updates.invoicedAt !== undefined) updateData.invoicedAt = updates.invoicedAt;
    if (updates.paymentRecordId !== undefined) updateData.paymentRecordId = updates.paymentRecordId;
    if (updates.paidAt !== undefined) updateData.paidAt = updates.paidAt;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    await db
      .updateTable('add_ons')
      .set(updateData)
      .where('id', '=', id)
      .execute();
  },

  /**
   * Soft delete an add-on
   */
  async delete(id: string): Promise<void> {
    await db
      .updateTable('add_ons')
      .set({ deletedAt: Date.now() })
      .where('id', '=', id)
      .execute();
  },

  /**
   * Get total add-on amount for a booking
   */
  async getTotalAddOnAmount(bookingId: string): Promise<number> {
    const result = await db
      .selectFrom('add_ons')
      .select(({ fn }) => fn.sum('amount').as('total'))
      .where('bookingId', '=', bookingId)
      .where('status', 'in', ['approved', 'paid', 'invoiced'])
      .where('deletedAt', 'is', null)
      .executeTakeFirst();

    return Number(result?.total || 0);
  },

  // ===== Audit Trail Methods =====

  /**
   * Create an audit entry
   */
  async createAuditEntry(entry: AddOnAuditEntry): Promise<void> {
    await db
      .insertInto('add_on_audit')
      .values({
        id: entry.id,
        addOnId: entry.addOnId,
        bookingId: entry.bookingId,
        action: entry.action,
        performedBy: entry.performedBy,
        performedByName: entry.performedByName,
        performedAt: entry.performedAt,
        details: entry.details,
        oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        newValues: entry.newValues ? JSON.stringify(entry.newValues) : null,
      })
      .execute();
  },

  /**
   * Get audit trail for an add-on
   */
  async getAuditTrail(addOnId: string): Promise<AddOnAuditEntry[]> {
    const rows = await db
      .selectFrom('add_on_audit')
      .selectAll()
      .where('addOnId', '=', addOnId)
      .orderBy('performedAt', 'desc')
      .execute();

    return rows.map(row => ({
      ...row,
      oldValues: safeJsonParse(row.oldValues, undefined),
      newValues: safeJsonParse(row.newValues, undefined),
    })) as AddOnAuditEntry[];
  },

  /**
   * Get audit trail for a booking
   */
  async getAuditTrailByBookingId(bookingId: string): Promise<AddOnAuditEntry[]> {
    const rows = await db
      .selectFrom('add_on_audit')
      .selectAll()
      .where('bookingId', '=', bookingId)
      .orderBy('performedAt', 'desc')
      .execute();

    return rows.map(row => ({
      ...row,
      oldValues: safeJsonParse(row.oldValues, undefined),
      newValues: safeJsonParse(row.newValues, undefined),
    })) as AddOnAuditEntry[];
  },
};
