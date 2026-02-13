#!/usr/bin/env node

/**
 * Villa Hadad - SQLite Database Cleanup Script
 *
 * This script directly connects to the local SQLite database file
 * and removes all test/fake data.
 *
 * Usage:
 *   node scripts/cleanup-sqlite.js --dry-run    # Preview only
 *   node scripts/cleanup-sqlite.js --execute    # Actually delete
 *
 * The script automatically detects database location:
 *   1. NAS: /Volumes/docker/villahadad-api/database/villahaddad_desktop.db
 *   2. Local: ~/Library/Application Support/VillaHadad/villahaddad_desktop.db
 */

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Configuration
const TEST_PATTERNS = {
  names: ['test', 'demo', 'tst', 'اختبار', 'تجربة', 'مثال', 'fake', 'dummy'],
  phones: ['0000', '1111', '1234', '9999', '07700000000', '123456', '000000'],
  emails: ['test@', 'example@', 'demo@', 'fake@'],
  minAmount: 50, // Amounts less than this are considered test data
};

// Find database file
function findDatabasePath() {
  // Try NAS first
  const nasPath = '/Volumes/docker/villahadad-api/database/villahaddad_desktop.db';
  if (fs.existsSync(nasPath)) {
    console.log('🔌 Using NAS Database:', nasPath);
    return nasPath;
  }

  // Fallback to local
  const localPath = path.join(
    os.homedir(),
    'Library/Application Support/VillaHadad/villahaddad_desktop.db'
  );
  if (fs.existsSync(localPath)) {
    console.log('💻 Using Local Database:', localPath);
    return localPath;
  }

  // Try current directory (for development)
  const devPath = './villahaddad_desktop.db';
  if (fs.existsSync(devPath)) {
    console.log('🔧 Using Development Database:', devPath);
    return devPath;
  }

  throw new Error(
    'Database file not found! Searched:\n  - ' + nasPath + '\n  - ' + localPath + '\n  - ' + devPath
  );
}

// Check if a value matches test patterns
function isTestValue(value, patterns) {
  if (!value) return false;
  const lowerValue = String(value).toLowerCase();
  return patterns.some(pattern => lowerValue.includes(pattern.toLowerCase()));
}

// Find test bookings
function findTestBookings(db) {
  const bookings = db.prepare('SELECT * FROM bookings WHERE deletedAt IS NULL').all();

  return bookings.filter(booking => {
    const clientName = booking.clientName || booking.client_name || '';
    const title = booking.title || '';
    const phone = booking.clientPhone || booking.phone || booking.client_phone || '';
    const email = booking.email || booking.client_email || '';
    const amount = parseFloat(booking.totalAmount || booking.total_amount || 0);

    return (
      isTestValue(clientName, TEST_PATTERNS.names) ||
      isTestValue(title, TEST_PATTERNS.names) ||
      isTestValue(phone, TEST_PATTERNS.phones) ||
      isTestValue(email, TEST_PATTERNS.emails) ||
      amount < TEST_PATTERNS.minAmount
    );
  });
}

// Preview what will be deleted
function previewDeletions(db) {
  console.log('\n🔍 Scanning for test data...\n');

  const testBookings = findTestBookings(db);

  if (testBookings.length === 0) {
    console.log('✅ No test bookings found!');
    return { bookings: [], totalRecords: 0 };
  }

  console.log(`📋 Found ${testBookings.length} test bookings:\n`);

  testBookings.forEach((booking, i) => {
    const name = booking.clientName || booking.client_name || 'Unknown';
    const phone = booking.clientPhone || booking.phone || booking.client_phone || 'N/A';
    const amount = booking.totalAmount || booking.total_amount || 0;
    console.log(`  ${i + 1}. ${name} | ${phone} | ${amount} IQD`);
  });

  // Count related records
  const bookingIds = testBookings.map(b => b.id);
  const placeholders = bookingIds.map(() => '?').join(',');

  const operations = db
    .prepare(`SELECT COUNT(*) as count FROM operations WHERE booking_id IN (${placeholders})`)
    .get(...bookingIds);
  const payments = db
    .prepare(`SELECT COUNT(*) as count FROM payments WHERE booking_id IN (${placeholders})`)
    .get(...bookingIds);
  const files = db
    .prepare(`SELECT COUNT(*) as count FROM booking_files WHERE booking_id IN (${placeholders})`)
    .get(...bookingIds);
  const notes = db
    .prepare(`SELECT COUNT(*) as count FROM booking_notes WHERE booking_id IN (${placeholders})`)
    .get(...bookingIds);

  const totalRecords =
    testBookings.length + operations.count + payments.count + files.count + notes.count;

  console.log('\n📊 Summary:');
  console.log(`   Bookings: ${testBookings.length}`);
  console.log(`   Operations: ${operations.count}`);
  console.log(`   Payments: ${payments.count}`);
  console.log(`   Files: ${files.count}`);
  console.log(`   Notes: ${notes.count}`);
  console.log(`   Total: ${totalRecords} records`);

  return { bookings: testBookings, totalRecords };
}

// Execute cleanup
function executeCleanup(db, testBookings) {
  console.log('\n🧹 Starting cleanup...\n');

  const bookingIds = testBookings.map(b => b.id);
  const placeholders = bookingIds.map(() => '?').join(',');

  let deleted = {
    bookings: 0,
    operations: 0,
    payments: 0,
    files: 0,
    notes: 0,
    notifications: 0,
  };

  // Use transaction for safety
  const transaction = db.transaction(() => {
    // 1. Delete operations
    const opsResult = db
      .prepare(`DELETE FROM operations WHERE booking_id IN (${placeholders})`)
      .run(...bookingIds);
    deleted.operations = opsResult.changes;
    console.log(`✅ Deleted ${opsResult.changes} operations`);

    // 2. Delete payments
    const payResult = db
      .prepare(`DELETE FROM payments WHERE booking_id IN (${placeholders})`)
      .run(...bookingIds);
    deleted.payments = payResult.changes;
    console.log(`✅ Deleted ${payResult.changes} payments`);

    // 3. Delete files
    const filesResult = db
      .prepare(`DELETE FROM booking_files WHERE booking_id IN (${placeholders})`)
      .run(...bookingIds);
    deleted.files = filesResult.changes;
    console.log(`✅ Deleted ${filesResult.changes} files`);

    // 4. Delete notes
    const notesResult = db
      .prepare(`DELETE FROM booking_notes WHERE booking_id IN (${placeholders})`)
      .run(...bookingIds);
    deleted.notes = notesResult.changes;
    console.log(`✅ Deleted ${notesResult.changes} notes`);

    // 5. Delete notifications
    const notifResult = db
      .prepare(`DELETE FROM notifications WHERE related_booking_id IN (${placeholders})`)
      .run(...bookingIds);
    deleted.notifications = notifResult.changes;
    console.log(`✅ Deleted ${notifResult.changes} notifications`);

    // 6. Finally delete bookings
    const bookingsResult = db
      .prepare(`DELETE FROM bookings WHERE id IN (${placeholders})`)
      .run(...bookingIds);
    deleted.bookings = bookingsResult.changes;
    console.log(`✅ Deleted ${bookingsResult.changes} bookings`);
  });

  transaction();

  return deleted;
}

// Verify cleanup
function verifyCleanup(db) {
  console.log('\n🔍 Verifying cleanup...\n');

  const remaining = findTestBookings(db);

  if (remaining.length === 0) {
    console.log('✅ All test data has been successfully removed!');
  } else {
    console.log(`⚠️  ${remaining.length} test bookings still remain`);
  }

  // Show remaining count
  const total = db.prepare('SELECT COUNT(*) as count FROM bookings WHERE deletedAt IS NULL').get();
  console.log(`📊 Total bookings in database: ${total.count}`);
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--execute');
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log(`
Villa Hadad SQLite Cleanup Script

Usage:
  node scripts/cleanup-sqlite.js [options]

Options:
  --execute     Actually delete test data (default is dry-run)
  --help, -h    Show this help

Examples:
  # Preview what will be deleted (safe)
  node scripts/cleanup-sqlite.js

  # Actually delete test data
  node scripts/cleanup-sqlite.js --execute

Test Data Patterns:
  - Names containing: test, demo, tst, اختبار, تجربة, مثال, fake, dummy
  - Phones containing: 0000, 1111, 1234, 9999, 07700000000, 123456
  - Emails containing: test@, example@, demo@
  - Amounts less than 50 IQD
`);
    process.exit(0);
  }

  console.log('\n🏛️  Villa Hadad - SQLite Database Cleanup\n');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (preview only)' : '⚠️  EXECUTE (will delete data)'}`);
  console.log('');

  try {
    // Find and connect to database
    const dbPath = findDatabasePath();
    const db = new Database(dbPath);

    console.log('✅ Connected to database\n');

    // Preview
    const { bookings, totalRecords } = previewDeletions(db);

    if (bookings.length === 0) {
      console.log('\n✅ Nothing to clean up!');
      db.close();
      process.exit(0);
    }

    // Execute if not dry run
    if (!isDryRun) {
      // Confirm
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question('\n⚠️  Type "yes" to confirm deletion: ', answer => {
        rl.close();

        if (answer.toLowerCase() !== 'yes') {
          console.log('\n❌ Operation cancelled.');
          db.close();
          process.exit(0);
        }

        // Execute
        const deleted = executeCleanup(db);

        // Verify
        verifyCleanup(db);

        // Summary
        console.log('\n📋 Cleanup Summary:');
        console.log(`   Bookings: ${deleted.bookings}`);
        console.log(`   Operations: ${deleted.operations}`);
        console.log(`   Payments: ${deleted.payments}`);
        console.log(`   Files: ${deleted.files}`);
        console.log(`   Notes: ${deleted.notes}`);
        console.log(`   Notifications: ${deleted.notifications}`);
        console.log(`\n✅ Database is ready for client handover!`);

        db.close();
      });
    } else {
      console.log('\n💡 To actually delete this data, run with --execute flag');
      db.close();
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
