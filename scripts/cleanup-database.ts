/**
 * Villa Hadad - Database Cleanup Script
 * 
 * This script safely removes test data from Supabase before client handover.
 * 
 * Usage:
 *   1. DRY RUN (preview what will be deleted):
 *      npx ts-node scripts/cleanup-database.ts --dry-run
 * 
 *   2. ACTUAL DELETION:
 *      npx ts-node scripts/cleanup-database.ts --execute
 * 
 *   3. With custom patterns:
 *      npx ts-node scripts/cleanup-database.ts --execute --patterns="test,demo,اختبار"
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

// Test data patterns (customize as needed)
const DEFAULT_TEST_PATTERNS = {
  namePatterns: [
    'test', 'اختبار', 'تجربة', 'demo', 'مثال', 'sample',
    'فحص', 'تجريبي', 'trial', 'dummy', 'fake'
  ],
  phonePatterns: [
    '0000', '1111', '1234', '9999', '0000000', '1111111'
  ],
  emailPatterns: [
    'test@', 'example@', 'demo@', 'fake@'
  ],
  minAmount: 50, // Bookings with amount less than this are considered test data
  maxDate: '2025-01-01', // Bookings before this date with test patterns
};

interface CleanupResult {
  bookingsDeleted: number;
  operationsDeleted: number;
  paymentsDeleted: number;
  filesDeleted: number;
  notesDeleted: number;
  notificationsDeleted: number;
}

class DatabaseCleanup {
  private supabase;
  private isDryRun: boolean;
  private patterns: typeof DEFAULT_TEST_PATTERNS;

  constructor(isDryRun: boolean = true, customPatterns?: Partial<typeof DEFAULT_TEST_PATTERNS>) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.isDryRun = isDryRun;
    this.patterns = { ...DEFAULT_TEST_PATTERNS, ...customPatterns };
  }

  async previewTestData(): Promise<void> {
    console.log('\n🔍 Searching for test data...\n');

    // Find test bookings
    const { data: testBookings, error: bookingsError } = await this.supabase
      .from('bookings')
      .select('id, client_name, phone, title, total_amount, created_at')
      .or(`client_name.ilike.%test%,client_name.ilike.%اختبار%,client_name.ilike.%تجربة%,phone.like.%0000%,phone.like.%1111%,total_amount.lt.${this.patterns.minAmount}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (bookingsError) {
      console.error('❌ Error fetching test bookings:', bookingsError);
      return;
    }

    if (!testBookings || testBookings.length === 0) {
      console.log('✅ No test bookings found!');
      return;
    }

    console.log(`📋 Found ${testBookings.length} test bookings:\n`);
    console.table(testBookings.map(b => ({
      ID: b.id,
      Name: b.client_name,
      Phone: b.phone,
      Title: b.title?.substring(0, 30),
      Amount: b.total_amount,
      Created: new Date(b.created_at).toLocaleDateString('ar-SA'),
    })));

    // Count related data
    const bookingIds = testBookings.map(b => b.id);

    const [operations, payments, files] = await Promise.all([
      this.countRelatedData('operations', bookingIds),
      this.countRelatedData('payments', bookingIds),
      this.countRelatedData('booking_files', bookingIds),
    ]);

    console.log('\n📊 Summary of data to be deleted:');
    console.log(`   Bookings: ${testBookings.length}`);
    console.log(`   Operations: ${operations}`);
    console.log(`   Payments: ${payments}`);
    console.log(`   Files: ${files}`);
    console.log(`   Total records: ${testBookings.length + operations + payments + files}`);
  }

  private async countRelatedData(table: string, bookingIds: number[]): Promise<number> {
    const { count, error } = await this.supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('booking_id', bookingIds);

    if (error) {
      console.error(`Error counting ${table}:`, error);
      return 0;
    }

    return count || 0;
  }

  async executeCleanup(): Promise<CleanupResult> {
    const result: CleanupResult = {
      bookingsDeleted: 0,
      operationsDeleted: 0,
      paymentsDeleted: 0,
      filesDeleted: 0,
      notesDeleted: 0,
      notificationsDeleted: 0,
    };

    console.log('\n🧹 Starting cleanup...\n');

    // Step 1: Get all test booking IDs
    const { data: testBookings, error: bookingsError } = await this.supabase
      .from('bookings')
      .select('id')
      .or(`client_name.ilike.%test%,client_name.ilike.%اختبار%,client_name.ilike.%تجربة%,phone.like.%0000%,phone.like.%1111%,total_amount.lt.${this.patterns.minAmount}`);

    if (bookingsError || !testBookings || testBookings.length === 0) {
      console.log('No test data to delete.');
      return result;
    }

    const bookingIds = testBookings.map(b => b.id);
    console.log(`Found ${bookingIds.length} test bookings to delete`);

    if (this.isDryRun) {
      console.log('\n⚠️  DRY RUN MODE - No actual deletion will occur');
      console.log('   Run with --execute to actually delete');
      return result;
    }

    // Step 2: Delete related data in correct order (respecting foreign keys)
    
    // 2.1 Delete files
    const { data: deletedFiles, error: filesError } = await this.supabase
      .from('booking_files')
      .delete()
      .in('booking_id', bookingIds)
      .select('id');
    
    if (!filesError && deletedFiles) {
      result.filesDeleted = deletedFiles.length;
      console.log(`✅ Deleted ${deletedFiles.length} files`);
    }

    // 2.2 Delete payments
    const { data: deletedPayments, error: paymentsError } = await this.supabase
      .from('payments')
      .delete()
      .in('booking_id', bookingIds)
      .select('id');
    
    if (!paymentsError && deletedPayments) {
      result.paymentsDeleted = deletedPayments.length;
      console.log(`✅ Deleted ${deletedPayments.length} payments`);
    }

    // 2.3 Delete operations
    const { data: deletedOperations, error: operationsError } = await this.supabase
      .from('operations')
      .delete()
      .in('booking_id', bookingIds)
      .select('id');
    
    if (!operationsError && deletedOperations) {
      result.operationsDeleted = deletedOperations.length;
      console.log(`✅ Deleted ${deletedOperations.length} operations`);
    }

    // 2.4 Delete booking notes
    const { data: deletedNotes, error: notesError } = await this.supabase
      .from('booking_notes')
      .delete()
      .in('booking_id', bookingIds)
      .select('id');
    
    if (!notesError && deletedNotes) {
      result.notesDeleted = deletedNotes.length;
      console.log(`✅ Deleted ${deletedNotes.length} notes`);
    }

    // 2.5 Delete notifications
    const { data: deletedNotifications, error: notificationsError } = await this.supabase
      .from('notifications')
      .delete()
      .in('related_booking_id', bookingIds)
      .select('id');
    
    if (!notificationsError && deletedNotifications) {
      result.notificationsDeleted = deletedNotifications.length;
      console.log(`✅ Deleted ${deletedNotifications.length} notifications`);
    }

    // Step 3: Finally delete the bookings
    const { data: deletedBookings, error: bookingsDeleteError } = await this.supabase
      .from('bookings')
      .delete()
      .in('id', bookingIds)
      .select('id');

    if (bookingsDeleteError) {
      console.error('❌ Error deleting bookings:', bookingsDeleteError);
    } else if (deletedBookings) {
      result.bookingsDeleted = deletedBookings.length;
      console.log(`✅ Deleted ${deletedBookings.length} bookings`);
    }

    return result;
  }

  async verifyCleanup(): Promise<void> {
    console.log('\n🔍 Verifying cleanup...\n');

    const { count: remainingBookings, error } = await this.supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .or(`client_name.ilike.%test%,client_name.ilike.%اختبار%,client_name.ilike.%تجربة%,phone.like.%0000%,phone.like.%1111%,total_amount.lt.${this.patterns.minAmount}`);

    if (error) {
      console.error('Error verifying:', error);
      return;
    }

    if (remainingBookings === 0) {
      console.log('✅ All test data has been successfully removed!');
    } else {
      console.log(`⚠️  ${remainingBookings} test records still remain`);
    }

    // Show remaining real bookings count
    const { count: totalBookings, error: countError } = await this.supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`📊 Total bookings in database: ${totalBookings}`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--execute');
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log(`
Villa Hadad Database Cleanup Script

Usage:
  npx ts-node scripts/cleanup-database.ts [options]

Options:
  --execute     Actually delete test data (default is dry-run)
  --help, -h    Show this help message

Examples:
  # Preview what will be deleted (safe)
  npx ts-node scripts/cleanup-database.ts

  # Actually delete test data
  npx ts-node scripts/cleanup-database.ts --execute

Environment Variables:
  VITE_SUPABASE_URL       Supabase project URL
  VITE_SUPABASE_ANON_KEY  Supabase anonymous key
`);
    process.exit(0);
  }

  console.log('\n🏛️  Villa Hadad - Database Cleanup\n');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (preview only)' : '⚠️  EXECUTE (will delete data)'}`);

  const cleanup = new DatabaseCleanup(isDryRun);

  // Step 1: Preview
  await cleanup.previewTestData();

  // Step 2: Confirm if executing
  if (!isDryRun) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('\n⚠️  Are you sure you want to DELETE this data? (yes/no): ', resolve);
    });

    rl.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Operation cancelled.');
      process.exit(0);
    }

    // Step 3: Execute
    const result = await cleanup.executeCleanup();

    // Step 4: Verify
    await cleanup.verifyCleanup();

    // Summary
    console.log('\n📋 Cleanup Summary:');
    console.log(`   Bookings deleted: ${result.bookingsDeleted}`);
    console.log(`   Operations deleted: ${result.operationsDeleted}`);
    console.log(`   Payments deleted: ${result.paymentsDeleted}`);
    console.log(`   Files deleted: ${result.filesDeleted}`);
    console.log(`   Notes deleted: ${result.notesDeleted}`);
    console.log(`   Notifications deleted: ${result.notificationsDeleted}`);
    console.log(`\n✅ Database is ready for client handover!`);
  } else {
    console.log('\n💡 To actually delete this data, run with --execute flag');
  }
}

main().catch(console.error);
