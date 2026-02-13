# 📚 Villa Hadad API Documentation

This document outlines the core services and APIs available in the application.

## 🏗️ Core Architecture

The application follows a **Local-First** architecture with cloud synchronization.
- **SQLite (Local):** Primary source of truth for offline capability.
- **Supabase (Cloud):** Secondary source for synchronization and backup.
- **SyncQueue:** Handles data synchronization when online connectivity is restored.

---

## 📅 BookingService

Handles all logic related to bookings, availability, and scheduling.

### `checkAvailability(shootDate, startTime, endTime, excludeBookingId?)`
Checks if a time slot is available for a new booking.
- **Returns:** `{ available: boolean, hasConflict: boolean, conflictMessage?: string }`
- **Usage:** Called before creating or updating a booking to prevent double booking.

### `addBooking(booking)`
Creates a new booking with validation and synchronization.
- **Process:**
  1. Validates input using Zod schema.
  2. Saves to Local DB (SQLite).
  3. Attempts to sync to Supabase (if online).
  4. If offline, adds to `SyncQueue`.
  5. Logs activity via `ActivityLogService`.

### `updateBooking(id, updates)`
Updates an existing booking.
- **Process:** Updates local DB and attempts cloud sync. Handles `details` JSON serialization automatically.

### `getPendingApprovals()`
Returns a list of bookings that require manager approval.

---

## 💰 PaymentService

Manages financial transactions, payments, and settlements.

### `addPayment(bookingId, paymentData)`
Records a new payment for a booking.
- **Process:**
  1. Creates payment record in `payments` table.
  2. Updates `paidAmount` in `bookings` table.
  3. Syncs changes to cloud.

### `settlePayment(bookingId, collectedBy)`
Automatically calculates remaining amount and records a full settlement payment.

---

## 🔄 OfflineManager

Manages connectivity state and synchronization queue.

### `init()`
Initializes listeners for online/offline events and starts NAS health checks.

### `checkConnection()`
Verifies internet connection AND NAS reachability (via Electron IPC).

### `processSyncQueue()`
Retries failed operations when connection is restored.

---

## 📝 ActivityLogService

Tracks user actions for audit trails.

### `logAction(action, entityType, entityId, details, user)`
Records an action (e.g., "User X updated Booking Y").
- **Storage:** Stored locally in `activity_logs` table.

---

## 🛠️ Data Models (Types)

### Booking
```typescript
interface Booking {
  id: string;
  clientName: string;
  shootDate: string; // ISO Date
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  totalAmount: number;
  paidAmount: number;
  details: BookingDetails; // JSON
}
```

### SyncQueueItem
```typescript
interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: 'booking' | 'user' | 'payment';
  data: any;
  timestamp: number;
}
```
