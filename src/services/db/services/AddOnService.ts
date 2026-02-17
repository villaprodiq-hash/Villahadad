import { AddOnRepository as addOnRepo } from '../repositories/AddOnRepository';
import { BookingRepository as bookingRepo } from '../repositories/BookingRepository';
import { SyncQueueService } from '../../sync/SyncQueue';
import { getWhatsAppUrl } from '../../../utils/whatsapp';
import { formatMoney } from '../../../utils/formatMoney';
import { v4 as uuidv4 } from 'uuid';
import {
  AddOnItem,
  AddOnSummary,
  AddOnAuditEntry,
  CreateAddOnData,
  InvoiceEntry,
  AddOnNotification,
} from '../../../types/addon.types';
import { Booking, UserRole } from '../../../../types';

/**
 * Add-On Service
 * Handles business logic for post-booking add-ons
 */
export class AddOnService {
  /**
   * Create a new add-on request
   */
  async createAddOn(
    bookingId: string,
    data: CreateAddOnData,
    user: { id: string; name: string }
  ): Promise<AddOnItem> {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const originalPackagePrice = booking.originalPackagePrice || booking.totalAmount;
    const previousTotal = booking.totalAmount;
    const newTotal = previousTotal + data.amount;

    const addOn: AddOnItem = {
      id: `addon_${Date.now()}`,
      bookingId,
      category: data.category,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      exchangeRate: data.exchangeRate,
      convertedAmount: data.amount, // ✅ No conversion - stays in original currency
      status: 'pending',
      requestedBy: user.id,
      requestedByName: user.name,
      requestedAt: new Date().toISOString(),
      originalPackagePrice,
      previousTotal,
      newTotal,
      notes: data.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to database
    await addOnRepo.create(addOn);

    // Log audit entry
    await this.logAuditEntry({
      id: `audit_${Date.now()}`,
      addOnId: addOn.id,
      bookingId,
      action: 'created',
      performedBy: user.id,
      performedByName: user.name,
      performedAt: new Date().toISOString(),
      details: `Add-on created: ${data.description} (${formatMoney(data.amount, data.currency)})`,
      newValues: addOn,
    });

    // Queue for sync
    await SyncQueueService.enqueue('create', 'add_on', addOn);

    return addOn;
  }

  /**
   * Approve an add-on (requires manager/admin approval)
   */
  async approveAddOn(
    addOnId: string,
    user: { id: string; name: string; role: UserRole }
  ): Promise<AddOnItem> {
    // Verify permissions
    if (!this.canApproveAddOns(user.role)) {
      throw new Error('Insufficient permissions to approve add-ons');
    }

    const addOn = await addOnRepo.getById(addOnId);
    if (!addOn) throw new Error('Add-on not found');
    if (addOn.status !== 'pending') {
      throw new Error(`Cannot approve add-on with status: ${addOn.status}`);
    }

    const updates: Partial<AddOnItem> = {
      status: 'approved',
      approvedBy: user.id,
      approvedByName: user.name,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addOnRepo.update(addOnId, updates);

    // Update booking total and add-on total
    const addOnTotal = await addOnRepo.getTotalAddOnAmount(addOn.bookingId);
    await bookingRepo.update(addOn.bookingId, {
      totalAmount: addOn.newTotal,
      addOnTotal,
    });

    // Log audit
    await this.logAuditEntry({
      id: `audit_${Date.now()}`,
      addOnId,
      bookingId: addOn.bookingId,
      action: 'approved',
      performedBy: user.id,
      performedByName: user.name,
      performedAt: new Date().toISOString(),
      details: `Add-on approved by ${user.name}`,
      oldValues: { status: 'pending' },
      newValues: updates,
    });

    // Queue for sync
    await SyncQueueService.enqueue('update', 'add_on', { id: addOnId, ...updates });

    // Send customer notification
    await this.notifyCustomer(addOn, 'approved');

    return { ...addOn, ...updates };
  }

  /**
   * Reject an add-on
   */
  async rejectAddOn(
    addOnId: string,
    reason: string,
    user: { id: string; name: string; role: UserRole }
  ): Promise<AddOnItem> {
    if (!this.canApproveAddOns(user.role)) {
      throw new Error('Insufficient permissions to reject add-ons');
    }

    const addOn = await addOnRepo.getById(addOnId);
    if (!addOn) throw new Error('Add-on not found');
    if (addOn.status !== 'pending') {
      throw new Error(`Cannot reject add-on with status: ${addOn.status}`);
    }

    const updates: Partial<AddOnItem> = {
      status: 'rejected',
      approvedBy: user.id,
      approvedByName: user.name,
      approvedAt: new Date().toISOString(),
      notes: reason,
      updatedAt: new Date().toISOString(),
    };

    await addOnRepo.update(addOnId, updates);

    // Log audit
    await this.logAuditEntry({
      id: `audit_${Date.now()}`,
      addOnId,
      bookingId: addOn.bookingId,
      action: 'rejected',
      performedBy: user.id,
      performedByName: user.name,
      performedAt: new Date().toISOString(),
      details: `Add-on rejected by ${user.name}. Reason: ${reason}`,
      oldValues: { status: 'pending' },
      newValues: updates,
    });

    await SyncQueueService.enqueue('update', 'add_on', { id: addOnId, ...updates });

    return { ...addOn, ...updates };
  }

  /**
   * Get add-on summary for a booking
   */
  async getAddOnSummary(bookingId: string): Promise<AddOnSummary> {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const items = await addOnRepo.getByBookingId(bookingId);
    const approvedItems = items.filter(i => 
      i.status === 'approved' || i.status === 'paid' || i.status === 'invoiced'
    );

    return {
      bookingId,
      originalPackagePrice: booking.originalPackagePrice || booking.totalAmount,
      totalAddOns: approvedItems.length,
      totalAddOnAmount: approvedItems.reduce((sum, i) => sum + i.amount, 0),
      currentTotal: booking.totalAmount,
      paidAmount: booking.paidAmount,
      remainingBalance: booking.totalAmount - booking.paidAmount,
      currency: booking.currency,
      items,
    };
  }

  /**
   * Get pending add-ons for a booking
   */
  async getPendingAddOns(bookingId: string): Promise<AddOnItem[]> {
    return await addOnRepo.getPendingByBookingId(bookingId);
  }

  /**
   * Generate updated invoice including add-ons
   */
  async generateUpdatedInvoice(
    bookingId: string,
    addOnIds: string[],
    user: { id: string; name: string }
  ): Promise<InvoiceEntry> {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) throw new Error('Booking not found');

    const addOns = await addOnRepo.getByIds(addOnIds);
    const approvedAddOns = addOns.filter(a => a.status === 'approved');

    const invoice: InvoiceEntry = {
      id: `inv_${Date.now()}`,
      invoiceNumber: await this.generateInvoiceNumber(bookingId),
      type: approvedAddOns.length > 0 ? 'add_on' : 'updated',
      generatedAt: new Date().toISOString(),
      generatedBy: user.id,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      addOnIds,
      sentToCustomer: false,
    };

    // Update add-ons with invoice reference
    for (const addOn of approvedAddOns) {
      await addOnRepo.update(addOn.id, {
        invoiceId: invoice.id,
        invoicedAt: invoice.generatedAt,
        status: 'invoiced',
      });

      await this.logAuditEntry({
        id: `audit_${Date.now()}_${addOn.id}`,
        addOnId: addOn.id,
        bookingId,
        action: 'invoiced',
        performedBy: user.id,
        performedByName: user.name,
        performedAt: new Date().toISOString(),
        details: `Add-on included in invoice ${invoice.invoiceNumber}`,
        newValues: { invoiceId: invoice.id, status: 'invoiced' },
      });

      await SyncQueueService.enqueue('update', 'add_on', {
        id: addOn.id,
        invoiceId: invoice.id,
        invoicedAt: invoice.generatedAt,
        status: 'invoiced',
      });
    }

    // Save invoice to booking history
    await this.appendInvoiceToBooking(bookingId, invoice);

    await SyncQueueService.enqueue('create', 'invoice', invoice);

    return invoice;
  }

  /**
   * Get audit trail for an add-on
   */
  async getAuditTrail(addOnId: string): Promise<AddOnAuditEntry[]> {
    return await addOnRepo.getAuditTrail(addOnId);
  }

  /**
   * Get audit trail for a booking
   */
  async getAuditTrailByBookingId(bookingId: string): Promise<AddOnAuditEntry[]> {
    return await addOnRepo.getAuditTrailByBookingId(bookingId);
  }

  /**
   * Delete an add-on (soft delete)
   */
  async deleteAddOn(
    addOnId: string,
    user: { id: string; name: string }
  ): Promise<void> {
    const addOn = await addOnRepo.getById(addOnId);
    if (!addOn) throw new Error('Add-on not found');

    await addOnRepo.delete(addOnId);

    // If the add-on was approved, recalculate booking totals
    if (addOn.status === 'approved' || addOn.status === 'paid') {
      const addOnTotal = await addOnRepo.getTotalAddOnAmount(addOn.bookingId);
      await bookingRepo.update(addOn.bookingId, {
        totalAmount: addOn.previousTotal,
        addOnTotal,
      });
    }

    await this.logAuditEntry({
      id: `audit_${Date.now()}`,
      addOnId,
      bookingId: addOn.bookingId,
      action: 'deleted',
      performedBy: user.id,
      performedByName: user.name,
      performedAt: new Date().toISOString(),
      details: `Add-on deleted by ${user.name}`,
      oldValues: addOn,
    });

    await SyncQueueService.enqueue('delete', 'add_on', { id: addOnId });
  }

  // ===== Private Helper Methods =====

  private canApproveAddOns(role: UserRole): boolean {
    return role === UserRole.MANAGER || role === UserRole.ADMIN;
  }

  private async logAuditEntry(entry: AddOnAuditEntry): Promise<void> {
    await addOnRepo.createAuditEntry(entry);
    await SyncQueueService.enqueue('create', 'add_on_audit', entry);
  }

  private async notifyCustomer(addOn: AddOnItem, type: 'approved' | 'request'): Promise<void> {
    const booking = await bookingRepo.getById(addOn.bookingId);
    if (!booking || !booking.clientPhone) return;

    const message = type === 'approved'
      ? this.generateAddOnApprovedMessage(addOn, booking)
      : this.generateAddOnRequestMessage(addOn, booking);

    // Update add-on with notification timestamp
    await addOnRepo.update(addOn.id, {
      customerNotifiedAt: new Date().toISOString(),
      notificationMethod: 'whatsapp',
    });

    // In a real implementation, this would queue the notification
    // For now, we just log it
    console.log(`📱 WhatsApp notification queued for ${booking.clientPhone}`);
    console.log(`Message: ${message}`);

    // Return the WhatsApp URL for the UI to use
    const whatsappUrl = getWhatsAppUrl(booking.clientPhone, message);
    console.log(`WhatsApp URL: ${whatsappUrl}`);
    
    // Store notification record (could be expanded to a separate table)
    const notification: AddOnNotification = {
      id: uuidv4(),
      addOnId: addOn.id,
      bookingId: addOn.bookingId,
      type: type === 'approved' ? 'approved' : 'request',
      method: 'whatsapp',
      recipient: booking.clientPhone,
      message,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    await SyncQueueService.enqueue('create', 'add_on_notification', notification);
  }

  private generateAddOnApprovedMessage(addOn: AddOnItem, booking: Booking): string {
    const remainingBalance = addOn.newTotal - booking.paidAmount;
    
    return `
مرحباً ${booking.clientName}،

تمت الموافقة على الخدمة الإضافية التالية:
📋 ${addOn.description}
💰 المبلغ: ${formatMoney(addOn.amount, addOn.currency)}

الفاتورة المحدثة:
━━━━━━━━━━━━━━━
الباقة الأصلية: ${formatMoney(addOn.originalPackagePrice, booking.currency)}
الإضافات: ${formatMoney(addOn.amount, addOn.currency)}
الإجمالي الجديد: ${formatMoney(addOn.newTotal, booking.currency)}
المدفوع: ${formatMoney(booking.paidAmount, booking.currency)}
المتبقي: ${formatMoney(remainingBalance, booking.currency)}
━━━━━━━━━━━━━━━

للاستفسار، يرجى التواصل معنا.
شكراً لاختياركم فيلا حداد 📸
    `.trim();
  }

  private generateAddOnRequestMessage(addOn: AddOnItem, booking: Booking): string {
    return `
مرحباً ${booking.clientName}،

نود إعلامكم بوجود خدمة إضافية مقترحة:
📋 ${addOn.description}
💰 المبلغ: ${formatMoney(addOn.amount, addOn.currency)}

في انتظار موافقتكم.

للموافقة، يرجى الرد على هذه الرسالة أو الاتصال بنا.
    `.trim();
  }

  private async generateInvoiceNumber(bookingId: string): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const bookingSuffix = bookingId.slice(-4);
    return `INV-${timestamp}-${bookingSuffix}`;
  }

  private async appendInvoiceToBooking(bookingId: string, invoice: InvoiceEntry): Promise<void> {
    const booking = await bookingRepo.getById(bookingId);
    if (!booking) return;

    const invoiceHistory: InvoiceEntry[] = booking.invoiceHistory 
      ? JSON.parse(booking.invoiceHistory as unknown as string)
      : [];
    
    invoiceHistory.push(invoice);

    await bookingRepo.update(bookingId, {
      invoiceHistory: invoiceHistory,
    });
  }
}

export const addOnService = new AddOnService();
