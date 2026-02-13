const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configuration
const DB_PATH = 'stress_test.db';
const DAYS = 180; // 6 months
const BOOKINGS_PER_DAY = 5;
const ACTIONS_PER_EMPLOYEE = 10;
const EMPLOYEES_COUNT = 5;

// Cleanup old test db
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

console.log('🚀 Starting Stress Test Simulation...');
console.log(`📅 Duration: ${DAYS} days`);
console.log(`📦 Target Bookings: ${DAYS * BOOKINGS_PER_DAY}`);
console.log(`📝 Target Logs: ${DAYS * EMPLOYEES_COUNT * ACTIONS_PER_EMPLOYEE}`);

const db = new Database(DB_PATH);

// 1. Initialize Schema (Simplified for performance test)
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    clientName TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    shootDate TEXT,
    status TEXT NOT NULL,
    totalAmount REAL DEFAULT 0,
    paidAmount REAL DEFAULT 0,
    currency TEXT DEFAULT 'IQD',
    details TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    createdAt TEXT NOT NULL
  );
`);

// 2. Generate Data
const insertBooking = db.prepare(`
  INSERT INTO bookings (id, clientName, category, title, shootDate, status, totalAmount, paidAmount, details, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertLog = db.prepare(`
  INSERT INTO activity_logs (id, userId, action, entityType, entityId, createdAt)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertSync = db.prepare(`
  INSERT INTO sync_queue (id, action, entity, status, createdAt)
  VALUES (?, ?, ?, ?, ?)
`);

console.log('⏳ Generating data...');
const startTime = Date.now();

db.transaction(() => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Start 3 months ago

  for (let day = 0; day < DAYS; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];

    // Create Bookings
    for (let b = 0; b < BOOKINGS_PER_DAY; b++) {
      const bookingId = uuidv4();
      const isPaid = Math.random() > 0.5;

      insertBooking.run(
        bookingId,
        `Client ${day}-${b}`,
        b % 2 === 0 ? 'Wedding' : 'Studio',
        `Booking ${day}-${b}`,
        dateStr,
        isPaid ? 'confirmed' : 'pending',
        500000,
        isPaid ? 500000 : 100000,
        JSON.stringify({ note: 'Stress test data' }),
        new Date().toISOString(),
        new Date().toISOString()
      );

      // Simulate Sync Queue for this booking
      insertSync.run(uuidv4(), 'create', 'booking', 'pending', new Date().toISOString());

      // Simulate Employee Actions
      for (let e = 0; e < EMPLOYEES_COUNT; e++) {
        // Each employee does 2 actions per booking on average to reach target
        insertLog.run(
          uuidv4(),
          `user_${e}`,
          'update',
          'booking',
          bookingId,
          new Date().toISOString()
        );
      }
    }
  }
})();

const duration = (Date.now() - startTime) / 1000;
console.log(`✅ Data Generation Complete in ${duration.toFixed(2)}s`);

// 3. Measure Performance
console.log('\n📊 Performance Metrics (SQLite):');

const queryStart = process.hrtime();
const allBookings = db.prepare('SELECT * FROM bookings').all();
const queryEnd = process.hrtime(queryStart);
console.log(`🔹 Select ALL Bookings (${allBookings.length}): ${queryEnd[1] / 1000000}ms`);

const dateQueryStart = process.hrtime();
const dateBookings = db
  .prepare('SELECT * FROM bookings WHERE shootDate = ?')
  .all(new Date().toISOString().split('T')[0]);
const dateQueryEnd = process.hrtime(dateQueryStart);
console.log(`🔹 Filter by Date (Today): ${dateQueryEnd[1] / 1000000}ms`);

const logsQueryStart = process.hrtime();
const stats = db.prepare('SELECT count(*) as count FROM activity_logs').get();
const logsQueryEnd = process.hrtime(logsQueryStart);
console.log(`🔹 Count Logs (${stats.count}): ${logsQueryEnd[1] / 1000000}ms`);

console.log('\n💡 Analysis:');
if (queryEnd[1] / 1000000 < 50) {
  console.log('🟢 Database Speed: Excellent (Under 50ms)');
} else {
  console.log('🔴 Database Speed: Warning (Over 50ms)');
}

console.log(`\n📦 Sync Queue Size: ${db.prepare('SELECT count(*) as c FROM sync_queue').get().c}`);
console.log('ℹ️  If the app was running, OfflineManager would process these items one by one.');
console.log('ℹ️  Bottleneck Prediction: Network latency during sync, not local DB speed.');
