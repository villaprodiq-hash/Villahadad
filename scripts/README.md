# Database Cleanup Scripts

Scripts to safely remove test data from Villa Hadad **SQLite database** before client handover.

## ⚠️ IMPORTANT

- **ALWAYS run in DRY RUN mode first** to preview what will be deleted
- **BACKUP your database** before running cleanup
- These scripts work with the local SQLite database (NOT Supabase)

## Database Location

The script automatically finds your database:

1. **NAS (if mounted)**: `/Volumes/docker/villahadad-api/database/villahaddad_desktop.db`
2. **Local**: `~/Library/Application Support/VillaHadad/villahaddad_desktop.db`
3. **Development**: `./villahaddad_desktop.db`

## Quick Start

### Option 1: Using Shell Script (Easiest)

```bash
# 1. Preview what will be deleted (safe)
./scripts/cleanup-sqlite.sh

# 2. Actually delete test data
./scripts/cleanup-sqlite.sh --execute
```

### Option 2: Using Node.js Directly

```bash
# Preview only
node scripts/cleanup-sqlite.js

# Actually delete
node scripts/cleanup-sqlite.js --execute
```

## What Gets Deleted?

Test data is identified by these patterns:

### Name Patterns
- Contains: `test`, `اختبار`, `تجربة`, `demo`, `مثال`, `fake`, `dummy`, `tst`

### Phone Patterns
- Contains: `0000`, `1111`, `1234`, `9999`
- Specific numbers: `07700000000`, `123456`, `000000`

### Email Patterns
- Contains: `test@`, `example@`, `demo@`

### Amount Patterns
- Bookings with amount less than 50 IQD (likely test data)

## Tables Affected

The cleanup removes data from these tables in order:

1. `operations` - Operations on test bookings
2. `payments` - Payments for test bookings
3. `booking_files` - Files attached to test bookings
4. `booking_notes` - Notes on test bookings
5. `notifications` - Notifications for test bookings
6. `bookings` - The test bookings themselves

## Safety Features

1. **Dry Run Mode**: Default mode shows what will be deleted without actually deleting
2. **Confirmation Prompt**: Requires typing "yes" before actual deletion
3. **Transaction Support**: All deletions happen in a single SQLite transaction (rollback if error)
4. **Foreign Key Order**: Deletes child records before parent records
5. **Verification**: Shows count of remaining test data after cleanup

## Backup First!

Before running cleanup, backup your database:

```bash
# Find your database
ls -la ~/Library/Application\ Support/VillaHadad/

# Create backup
cp ~/Library/Application\ Support/VillaHadad/villahaddad_desktop.db \
   ~/Library/Application\ Support/VillaHadad/villahaddad_desktop_backup_$(date +%Y%m%d).db
```

Or if using NAS:
```bash
cp /Volumes/docker/villahadad-api/database/villahaddad_desktop.db \
   /Volumes/docker/villahadad-api/database/villahaddad_desktop_backup_$(date +%Y%m%d).db
```

## Customization

### Modify Test Patterns

Edit `scripts/cleanup-sqlite.js` and change `TEST_PATTERNS`:

```javascript
const TEST_PATTERNS = {
  names: ['test', 'اختبار', /* add your patterns */],
  phones: ['0000', '1111', /* add your patterns */],
  emails: ['test@', 'example@'],
  minAmount: 50, // Change threshold
};
```

## Troubleshooting

### "Error: Database file not found"

Make sure the app has been run at least once to create the database.

### "Error: Cannot find module 'better-sqlite3'"

```bash
npm install better-sqlite3
```

### "Permission denied" when running shell script

```bash
chmod +x scripts/cleanup-sqlite.sh
```

## After Cleanup

Verify the cleanup was successful by running the app and checking:

1. No test bookings appear in the bookings list
2. All remaining data is real client data

## Alternative: Manual Cleanup with DB Browser

If you prefer GUI:

1. Download [DB Browser for SQLite](https://sqlitebrowser.org/)
2. Open the database file
3. Run SQL queries to find and delete test data
4. Example query to find test bookings:

```sql
SELECT * FROM bookings 
WHERE LOWER(clientName) LIKE '%test%' 
   OR LOWER(clientName) LIKE '%اختبار%'
   OR phone LIKE '%0000%'
   OR totalAmount < 50;
```

## Support

If you encounter issues:
1. Check the preview output carefully
2. Verify database file exists and is accessible
3. Ensure you have proper permissions
4. Check console logs for specific errors
