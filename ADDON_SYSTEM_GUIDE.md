# Post-Booking Add-On System Guide

## Overview

The Post-Booking Add-On System allows photography studios to add extra services after the initial booking has been created. This system provides:

1. **Financial Attribution** - Clear tracking of original package price vs. add-ons
2. **Complete Payment History** - Every transaction with exchange rates and timestamps
3. **Multi-Currency Support** - IQD and USD with per-transaction exchange rates
4. **Updated Invoices** - Reflect revised totals while preserving original terms
5. **Customer Notifications** - Automated WhatsApp notifications for balance changes
6. **Audit Trails** - Complete history of who authorized each add-on and when

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AddOnManager │  │PaymentHistory│  │UpdatedInvoice│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AddOnService │  │PaymentService│  │Notification  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  AddOns      │  │   Payments   │  │ AddOnAudit   │          │
│  │   Table      │  │    Table     │  │   Table      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Models

### AddOnItem

```typescript
interface AddOnItem {
  id: string;
  bookingId: string;
  category: AddOnCategory;
  description: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;        // IQD per USD at time of creation
  convertedAmount: number;     // Amount in IQD
  status: AddOnStatus;         // pending | approved | rejected | invoiced | paid
  
  // Authorization tracking
  requestedBy: string;         // User ID
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string;         // User ID
  approvedByName?: string;
  approvedAt?: string;
  
  // Financial attribution
  originalPackagePrice: number; // Snapshot at creation
  previousTotal: number;        // Total before this add-on
  newTotal: number;             // Total after this add-on
  
  // Customer notification
  customerNotifiedAt?: string;
  notificationMethod?: 'whatsapp' | 'sms' | 'email';
  
  // Invoice tracking
  invoiceId?: string;
  invoicedAt?: string;
  
  // Payment tracking
  paymentRecordId?: string;
  paidAt?: string;
}
```

### PaymentHistoryEntry

```typescript
interface PaymentHistoryEntry {
  id: string;
  amount: number;
  currency: Currency;
  exchangeRate: number;
  convertedAmount: number;
  type: 'initial_deposit' | 'installment' | 'add_on_payment' | 'final_settlement';
  relatedAddOnId?: string;
  paidAt: string;
  receivedBy: string;
  paymentMethod: 'Cash' | 'Mastercard' | 'ZainCash';
  notes?: string;
}
```

## Usage Examples

### 1. Creating an Add-On

```typescript
import { addOnService } from './services/db/services/AddOnService';

// Reception creates an add-on request
const addOn = await addOnService.createAddOn(
  'booking_123',
  {
    category: 'additional_edits',
    description: 'تعديلات إضافية - 10 صور',
    amount: 100000,
    currency: 'IQD',
    exchangeRate: 1450,
    notes: 'طلب العميل',
  },
  { id: 'user_rec_1', name: 'أحمد' }
);

// Status: pending, awaiting manager approval
console.log(addOn.status); // 'pending'
```

### 2. Approving an Add-On

```typescript
// Manager approves the add-on
const approvedAddOn = await addOnService.approveAddOn(
  addOn.id,
  { 
    id: 'user_mgr_1', 
    name: 'المديرة', 
    role: UserRole.MANAGER 
  }
);

// Customer is automatically notified via WhatsApp
// Booking total is updated
console.log(approvedAddOn.status); // 'approved'
```

### 3. Processing Add-On Payment

```typescript
import { paymentService } from './services/db/services/PaymentService';

// Customer pays for the add-on
const payment = await paymentService.addAddOnPayment(
  booking.id,
  approvedAddOn.id,
  {
    amount: 100000,
    currency: 'IQD',
    exchangeRate: 1450,
    paymentMethod: 'Cash',
  },
  { id: 'user_rec_1', name: 'أحمد' }
);

// Add-on status changes to 'paid'
// Payment history is updated
```

### 4. Generating Updated Invoice

```typescript
// Generate invoice with all approved add-ons
const invoice = await addOnService.generateUpdatedInvoice(
  booking.id,
  addOns.filter(a => a.status === 'approved').map(a => a.id),
  { id: currentUser.id, name: currentUser.name }
);

// Send to customer via WhatsApp
const message = generateInvoiceMessage(invoice, booking);
const whatsappUrl = getWhatsAppUrl(booking.clientPhone, message);
window.open(whatsappUrl, '_blank');
```

### 5. Viewing Payment History

```typescript
import { PaymentHistory } from './components/payments/PaymentHistory';

// In your component
<PaymentHistory booking={booking} />
```

### 6. Managing Add-Ons

```typescript
import { AddOnManager } from './components/addons/AddOnManager';

// In your component
<AddOnManager
  booking={booking}
  currentUser={currentUser}
  onAddOnCreated={(addOn) => console.log('Created:', addOn)}
  onAddOnApproved={(addOn) => console.log('Approved:', addOn)}
  onInvoiceGenerated={(invoice) => console.log('Invoice:', invoice)}
/>
```

## UI Components

### AddOnManager

The main component for managing add-ons:

- View all add-ons for a booking
- Create new add-on requests
- Approve/reject pending add-ons (manager only)
- Delete add-ons
- Generate updated invoices
- View financial summary

```tsx
<AddOnManager
  booking={booking}
  currentUser={currentUser}
/>
```

### PaymentHistory

Displays complete payment history with exchange rate details:

- All payments with timestamps
- Exchange rates per transaction
- Converted amounts in IQD
- Payment methods
- Remaining balance calculation

```tsx
<PaymentHistory booking={booking} />
```

### UpdatedInvoice

Generates and displays updated invoices:

- Original package price
- List of add-ons
- Total calculations
- WhatsApp sharing
- PDF download

```tsx
<UpdatedInvoice
  booking={booking}
  addOns={approvedAddOns}
  invoice={invoice}
/>
```

## Integration with Existing Workflows

### App.tsx Integration

```typescript
// In AppContent component
const handleAddAddOn = async (bookingId: string, addOnData: CreateAddOnData) => {
  const addOn = await addOnService.createAddOn(
    bookingId,
    addOnData,
    { id: currentUser.id, name: currentUser.name }
  );
  
  // Refresh booking data
  await refreshBooking(bookingId);
  
  toast.success('تم إنشاء طلب الخدمة الإضافية');
  return addOn;
};

// Extend settlePayment to handle add-ons
const handleSettlePayment = async (amountInput?: number, currentExchangeRate?: number) => {
  const targetBooking = paymentContextBooking || selectedBooking;
  if (!targetBooking) return;
  
  // Check for pending add-ons
  const pendingAddOns = await addOnService.getPendingAddOns(targetBooking.id);
  if (pendingAddOns.length > 0) {
    toast.error('يوجد طلبات خدمات إضافية بانتظار الموافقة');
    return;
  }
  
  // Use enhanced payment service
  const result = await paymentService.settlePaymentWithAddOns(
    targetBooking.id,
    currentUser.name,
    currentExchangeRate
  );
  
  // ... rest of existing logic
};
```

## Database Schema

### New Tables

#### add_ons
```sql
CREATE TABLE add_ons (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IQD',
  exchange_rate REAL NOT NULL,
  converted_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by TEXT NOT NULL,
  requested_by_name TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  approved_by TEXT,
  approved_by_name TEXT,
  approved_at TEXT,
  original_package_price REAL NOT NULL,
  previous_total REAL NOT NULL,
  new_total REAL NOT NULL,
  customer_notified_at TEXT,
  notification_method TEXT,
  invoice_id TEXT,
  invoiced_at TEXT,
  payment_record_id TEXT,
  paid_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at INTEGER
);
```

#### add_on_audit
```sql
CREATE TABLE add_on_audit (
  id TEXT PRIMARY KEY,
  add_on_id TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  performed_by_name TEXT NOT NULL,
  performed_at TEXT NOT NULL,
  details TEXT NOT NULL,
  old_values TEXT,
  new_values TEXT
);
```

### Extended Tables

#### bookings (extended)
```sql
ALTER TABLE bookings ADD COLUMN original_package_price REAL;
ALTER TABLE bookings ADD COLUMN add_on_total REAL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN payment_history TEXT; -- JSON array
ALTER TABLE bookings ADD COLUMN invoice_history TEXT; -- JSON array
```

#### payments (extended)
```sql
ALTER TABLE payments ADD COLUMN currency TEXT;
ALTER TABLE payments ADD COLUMN exchange_rate REAL;
ALTER TABLE payments ADD COLUMN converted_amount REAL;
ALTER TABLE payments ADD COLUMN type TEXT;
ALTER TABLE payments ADD COLUMN related_add_on_id TEXT;
```

## Permissions

| Role | Create Add-Ons | Approve Add-Ons | View History | Generate Invoices |
|------|----------------|-----------------|--------------|-------------------|
| Manager | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Reception | ✅ | ❌ | ✅ | ❌ |
| Other | ❌ | ❌ | ❌ | ❌ |

## Notifications

The system automatically sends WhatsApp notifications for:

1. **Add-On Approved** - Customer is notified when an add-on is approved
2. **Add-On Request** - Customer receives a request for approval
3. **Invoice Ready** - Customer is notified when an updated invoice is generated
4. **Payment Reminder** - Reminder for remaining balance

### Notification Templates

```typescript
import { 
  generateAddOnApprovedMessage,
  generateAddOnRequestMessage,
  generateInvoiceReadyMessage,
  generatePaymentReminderMessage
} from './utils/addOnNotifications';

// Generate message
const message = generateAddOnApprovedMessage(addOn, booking);

// Open WhatsApp
const url = getWhatsAppUrl(booking.clientPhone, message);
window.open(url, '_blank');
```

## Audit Trail

Every action on an add-on is logged:

- **Created** - When an add-on is first created
- **Approved** - When a manager approves an add-on
- **Rejected** - When a manager rejects an add-on
- **Modified** - When an add-on is updated
- **Deleted** - When an add-on is deleted
- **Invoiced** - When an add-on is included in an invoice
- **Paid** - When payment is received for an add-on

### Viewing Audit Trail

```typescript
// Get audit trail for a specific add-on
const auditTrail = await addOnService.getAuditTrail(addOnId);

// Get all audit entries for a booking
const bookingAudit = await addOnService.getAuditTrailByBookingId(bookingId);
```

## Exchange Rate Handling

The system tracks exchange rates per transaction:

1. **At Creation** - Exchange rate is recorded when add-on is created
2. **At Payment** - Exchange rate is recorded when payment is made
3. **Conversion** - All amounts are converted to IQD for reporting

Example:
```typescript
const addOn = {
  amount: 100,           // USD
  exchangeRate: 1450,    // IQD per USD
  convertedAmount: 145000 // IQD
};
```

## Best Practices

1. **Always check permissions** before allowing add-on approval
2. **Verify pending add-ons** before settling payments
3. **Notify customers** promptly when add-ons are approved
4. **Keep audit trail** clean by logging all actions
5. **Use exchange rates** consistently for multi-currency bookings
6. **Archive old add-ons** rather than deleting them

## Troubleshooting

### Add-On Not Appearing
- Check that the add-on status is not 'deleted'
- Verify the booking ID is correct
- Check database connection

### Payment Not Recording
- Verify the add-on is approved before payment
- Check that the amount matches the add-on amount
- Ensure exchange rate is provided for USD payments

### Notifications Not Sending
- Verify the booking has a valid phone number
- Check WhatsApp URL generation
- Ensure notification method is set correctly

## Migration Guide

### For Existing Bookings

1. Set `originalPackagePrice` to current `totalAmount`:
```sql
UPDATE bookings SET original_package_price = total_amount WHERE original_package_price IS NULL;
```

2. Initialize `addOnTotal` to 0:
```sql
UPDATE bookings SET add_on_total = 0 WHERE add_on_total IS NULL;
```

3. Convert existing payment records to payment history format

## Support

For issues or questions:
- Check the audit trail for action history
- Review payment history for transaction details
- Verify permissions for user actions
- Check sync queue for pending operations
