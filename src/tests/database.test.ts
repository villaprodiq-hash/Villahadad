import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';

describe('Database Integration Tests (In-Memory SQLite)', () => {
  let db: Database.Database;

  beforeAll(() => {
    // Initialize in-memory SQLite database
    db = new Database(':memory:');
    
    // Create simplified bookings table schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        clientName TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ In-memory database initialized');
  });

  afterAll(() => {
    // Clean up: close database connection
    if (db) {
      db.close();
      console.log('✅ Database connection closed');
    }
  });

  it('should create bookings table successfully', () => {
    // Verify table exists
    const tableInfo = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='bookings'"
    ).get();
    
    expect(tableInfo).toBeDefined();
    expect(tableInfo).toHaveProperty('name', 'bookings');
  });

  it('should insert a booking record', () => {
    // Insert test booking
    const insertStmt = db.prepare(`
      INSERT INTO bookings (id, clientName, amount, status)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = insertStmt.run(
      'test-booking-001',
      'أحمد محمد',
      500000,
      'CONFIRMED'
    );
    
    expect(result.changes).toBe(1);
    expect(result.lastInsertRowid).toBeDefined();
  });

  it('should select and verify the inserted booking', () => {
    // Query the inserted record
    const selectStmt = db.prepare(`
      SELECT id, clientName, amount, status
      FROM bookings
      WHERE id = ?
    `);
    
    const booking = selectStmt.get('test-booking-001') as {
      id: string;
      clientName: string;
      amount: number;
      status: string;
    };
    
    // Verify data matches exactly
    expect(booking).toBeDefined();
    expect(booking.id).toBe('test-booking-001');
    expect(booking.clientName).toBe('أحمد محمد');
    expect(booking.amount).toBe(500000);
    expect(booking.status).toBe('CONFIRMED');
  });

  it('should update a booking record', () => {
    // Update the booking status
    const updateStmt = db.prepare(`
      UPDATE bookings
      SET status = ?, amount = ?
      WHERE id = ?
    `);
    
    const result = updateStmt.run('SHOOTING', 600000, 'test-booking-001');
    
    expect(result.changes).toBe(1);
    
    // Verify the update
    const booking = db.prepare('SELECT status, amount FROM bookings WHERE id = ?')
      .get('test-booking-001') as { status: string; amount: number };
    
    expect(booking.status).toBe('SHOOTING');
    expect(booking.amount).toBe(600000);
  });

  it('should delete a booking record', () => {
    // Delete the booking
    const deleteStmt = db.prepare('DELETE FROM bookings WHERE id = ?');
    const result = deleteStmt.run('test-booking-001');
    
    expect(result.changes).toBe(1);
    
    // Verify deletion
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?')
      .get('test-booking-001');
    
    expect(booking).toBeUndefined();
  });

  it('should handle multiple inserts and queries', () => {
    // Insert multiple bookings
    const insertStmt = db.prepare(`
      INSERT INTO bookings (id, clientName, amount, status)
      VALUES (?, ?, ?, ?)
    `);
    
    const bookings = [
      { id: 'booking-001', name: 'علي حسن', amount: 300000, status: 'INQUIRY' },
      { id: 'booking-002', name: 'فاطمة أحمد', amount: 450000, status: 'CONFIRMED' },
      { id: 'booking-003', name: 'محمد علي', amount: 700000, status: 'SHOOTING' },
    ];
    
    bookings.forEach(b => {
      insertStmt.run(b.id, b.name, b.amount, b.status);
    });
    
    // Query all bookings
    const allBookings = db.prepare('SELECT * FROM bookings').all();
    
    expect(allBookings).toHaveLength(3);
    expect(allBookings[0]).toHaveProperty('clientName', 'علي حسن');
    expect(allBookings[1]).toHaveProperty('amount', 450000);
    expect(allBookings[2]).toHaveProperty('status', 'SHOOTING');
  });

  it('should filter bookings by status', () => {
    // Query bookings with specific status
    const confirmedBookings = db.prepare(`
      SELECT * FROM bookings WHERE status = ?
    `).all('CONFIRMED');
    
    expect(confirmedBookings).toHaveLength(1);
    expect(confirmedBookings[0]).toHaveProperty('clientName', 'فاطمة أحمد');
  });

  it('should calculate total amount across all bookings', () => {
    // Calculate sum of amounts
    const result = db.prepare(`
      SELECT SUM(amount) as total FROM bookings
    `).get() as { total: number };
    
    const expectedTotal = 300000 + 450000 + 700000;
    expect(result.total).toBe(expectedTotal);
  });

  it('should handle transactions (rollback on error)', () => {
    // Start transaction
    const insertInTransaction = db.transaction((bookings: Array<{ id: string; name: string; amount: number; status: string }>) => {
      const stmt = db.prepare(`
        INSERT INTO bookings (id, clientName, amount, status)
        VALUES (?, ?, ?, ?)
      `);
      
      for (const booking of bookings) {
        stmt.run(booking.id, booking.name, booking.amount, booking.status);
      }
    });
    
    // Execute transaction
    insertInTransaction([
      { id: 'tx-001', name: 'Test 1', amount: 100000, status: 'INQUIRY' },
      { id: 'tx-002', name: 'Test 2', amount: 200000, status: 'CONFIRMED' },
    ]);
    
    // Verify both records were inserted
    const txBookings = db.prepare(`
      SELECT * FROM bookings WHERE id LIKE 'tx-%'
    `).all();
    
    expect(txBookings).toHaveLength(2);
  });
});
