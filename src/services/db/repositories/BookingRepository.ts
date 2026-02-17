import { db } from '../index';
import { Booking, BookingCategory, BookingStatus, UserRole } from '../../../../types';
import { safeJsonParse } from '../../../utils/safeJson';

/**
 * ? BOOKING REPOSITORY WITH RBAC ENFORCEMENT
 * Reception users only see today/future bookings
 * Managers see everything
 */
export const BookingRepository = {
  /**
   * Get all bookings with RBAC filtering
   * @param role - User role for filtering (optional for backward compatibility)
   */
  async getAll(role?: UserRole | string): Promise<Booking[]> {
    try {
      let query = db
        .selectFrom('bookings')
        .selectAll()
        .where('deletedAt', 'is', null);

      // RBAC ENFORCEMENT
      if (role === 'reception' || role === UserRole.RECEPTION) {
        const today = new Date().toISOString().split('T')[0] ?? '';
        query = query.where('shootDate', '>=', today);
      }

      const bookings = await query
        .orderBy('shootDate', 'desc')
        .execute();

      return bookings.map(b => {
        const details = safeJsonParse<Record<string, unknown> | undefined>(b.details, undefined);
        return {
          ...b,
          category: b.category as BookingCategory,
          status: b.status as BookingStatus,
          details,
          extras: [],
          nasStatus: (b.nasStatus ?? 'none') as Booking['nasStatus'],
          statusHistory: safeJsonParse(b.statusHistory, []) as Booking['statusHistory'],
          paymentHistory: safeJsonParse(b.paymentHistory, undefined),
          invoiceHistory: safeJsonParse(b.invoiceHistory, undefined),
          isVIP: Boolean(details?.isVIP),
          isFamous: Boolean(details?.isFamous),
        };
      }) as unknown as Booking[];
    } catch (error) {
      console.error('❌ BookingRepository.getAll failed:', error);
      return [];
    }
  },

  async getById(id: string): Promise<Booking | null> {
    try {
      const b = await db
        .selectFrom('bookings')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!b) return null;

      return {
        ...b,
        category: b.category as BookingCategory,
        status: b.status as BookingStatus,
        details: safeJsonParse(b.details, undefined),
        nasStatus: (b.nasStatus ?? 'none') as Booking['nasStatus'],
        statusHistory: safeJsonParse(b.statusHistory, []) as Booking['statusHistory'],
        paymentHistory: safeJsonParse(b.paymentHistory, undefined),
        invoiceHistory: safeJsonParse(b.invoiceHistory, undefined),
      } as unknown as Booking;
    } catch (error) {
      console.error(`❌ BookingRepository.getById(${id}) failed:`, error);
      return null;
    }
  },

  async create(booking: Booking): Promise<Booking> {
    try {
      const { details } = booking;

      await db
        .insertInto('bookings')
        .values({
          id: booking.id,
          clientId: booking.clientId,
          clientName: booking.clientName,
          clientPhone: booking.clientPhone,
          category: booking.category,
          title: booking.title,
          shootDate: booking.shootDate,
          status: booking.status,
          totalAmount: booking.totalAmount,
          paidAmount: booking.paidAmount,
          currency: booking.currency,
          servicePackage: booking.servicePackage,
          details: JSON.stringify(details || {}),
          nasStatus: booking.nasStatus || 'none',
          nasProgress: booking.nasProgress || 0,
          notes: booking.notes || null,
          createdBy: booking.created_by || null,
          updatedAt: new Date().toISOString(),
          statusHistory: booking.statusHistory ? JSON.stringify(booking.statusHistory) : null,
          location: booking.location || null,
        })
        .execute();

      return booking;
    } catch (error) {
      console.error('❌ BookingRepository.create failed:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<Booking>): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Prevent accidental PK mutation and unsupported keys.
      delete updateData.id;
      delete updateData.extras;
      delete updateData.createdAt;

      // SQLite bind only accepts primitive values (or null), so normalize aggressively.
      const jsonFields = new Set(['details', 'statusHistory', 'paymentHistory', 'invoiceHistory']);
      const booleanIntegerFields = new Set(['isPriority', 'isCrewShooting']);
      const bindableData: Record<string, unknown> = {};

      for (const [key, rawValue] of Object.entries(updateData)) {
        if (rawValue === undefined) continue;

        if (rawValue === null) {
          bindableData[key] = null;
          continue;
        }

        if (booleanIntegerFields.has(key)) {
          bindableData[key] = rawValue ? 1 : 0;
          continue;
        }

        if (jsonFields.has(key)) {
          bindableData[key] = typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue);
          continue;
        }

        if (rawValue instanceof Date) {
          bindableData[key] = rawValue.toISOString();
          continue;
        }

        const valueType = typeof rawValue;
        if (
          valueType === 'string' ||
          valueType === 'number' ||
          valueType === 'bigint' ||
          valueType === 'boolean'
        ) {
          // Boolean fields not in explicit list are normalized to 0/1 to be safe for SQLite IPC.
          bindableData[key] = valueType === 'boolean' ? ((rawValue as boolean) ? 1 : 0) : rawValue;
          continue;
        }

        // Fallback: serialize any object/array to JSON to avoid SQLite bind errors.
        bindableData[key] = JSON.stringify(rawValue);
      }

      await db
        .updateTable('bookings')
        .set(bindableData)
        .where('id', '=', id)
        .execute();
    } catch (error) {
      console.error(`❌ BookingRepository.update(${id}) failed:`, error);
      throw error;
    }
  },

  async softDelete(id: string): Promise<void> {
    try {
      await db
        .updateTable('bookings')
        .set({ deletedAt: Date.now() })
        .where('id', '=', id)
        .execute();
    } catch (error) {
      console.error(`❌ BookingRepository.softDelete(${id}) failed:`, error);
      throw error;
    }
  },

  async restore(id: string): Promise<void> {
    try {
      await db
        .updateTable('bookings')
        .set({ deletedAt: null })
        .where('id', '=', id)
        .execute();
    } catch (error) {
      console.error(`❌ BookingRepository.restore(${id}) failed:`, error);
      throw error;
    }
  },

  async hardDelete(id: string): Promise<void> {
    try {
      await db
        .deleteFrom('bookings')
        .where('id', '=', id)
        .execute();
    } catch (error) {
      console.error(`❌ BookingRepository.hardDelete(${id}) failed:`, error);
      throw error;
    }
  },

  async getDeleted(): Promise<Booking[]> {
    try {
      const bookings = await db
        .selectFrom('bookings')
        .selectAll()
        .where('deletedAt', 'is not', null)
        .orderBy('deletedAt', 'desc')
        .execute();

      return bookings.map(b => {
        const details = safeJsonParse<Record<string, unknown> | undefined>(b.details, undefined);
        return {
          ...b,
          category: b.category as BookingCategory,
          status: b.status as BookingStatus,
          details,
          nasStatus: (b.nasStatus ?? 'none') as Booking['nasStatus'],
          statusHistory: safeJsonParse(b.statusHistory, []) as Booking['statusHistory'],
          paymentHistory: safeJsonParse(b.paymentHistory, undefined),
          invoiceHistory: safeJsonParse(b.invoiceHistory, undefined),
          isVIP: Boolean(details?.isVIP),
          isFamous: Boolean(details?.isFamous),
        };
      }) as unknown as Booking[];
    } catch (error) {
      console.error('❌ BookingRepository.getDeleted failed:', error);
      return [];
    }
  },

  async cleanupOldDeleted(days: number = 30): Promise<number> {
    try {
      const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

      const result = await db
        .deleteFrom('bookings')
        .where('deletedAt', '<=', cutoffDate)
        .execute();

      return Number(result[0]?.numDeletedRows || 0);
    } catch (error) {
      console.error('❌ BookingRepository.cleanupOldDeleted failed:', error);
      return 0;
    }
  },
};
