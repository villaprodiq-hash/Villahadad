-- ============================================
-- VILLA HADAD - DATABASE CLEANUP SCRIPT
-- Removes test data while preserving real client data
-- ============================================

-- IMPORTANT: Run this in a transaction so you can rollback if needed
-- BEGIN; -- Uncomment to use transaction

-- ============================================
-- STEP 1: Preview what will be deleted (DRY RUN)
-- ============================================

-- Find test bookings (adjust patterns as needed)
WITH test_bookings_preview AS (
  SELECT 
    b.id,
    b.client_name,
    b.phone,
    b.title,
    b.created_at,
    b.total_amount,
    'TEST BOOKING' as reason
  FROM bookings b
  WHERE 
    -- Pattern 1: Names containing "test", "اختبار", "تجربة"
    LOWER(b.client_name) LIKE '%test%'
    OR LOWER(b.client_name) LIKE '%اختبار%'
    OR LOWER(b.client_name) LIKE '%تجربة%'
    OR LOWER(b.client_name) LIKE '%demo%'
    OR LOWER(b.client_name) LIKE '%مثال%'
    
    -- Pattern 2: Test phone numbers
    OR b.phone LIKE '%0000%'
    OR b.phone LIKE '%1111%'
    OR b.phone LIKE '%1234%'
    OR b.phone LIKE '%9999%'
    OR b.phone IN ('0500000000', '0511111111', '0501234567')
    
    -- Pattern 3: Test emails
    OR LOWER(b.client_email) LIKE '%test%'
    OR LOWER(b.client_email) LIKE '%example%'
    OR LOWER(b.client_email) LIKE '%demo%'
    
    -- Pattern 4: Very low amounts (likely test data)
    OR b.total_amount < 50
    
    -- Pattern 5: Old test data (before specific date)
    OR (b.created_at < '2025-01-01' AND b.client_name LIKE '%test%')
),

test_operations_preview AS (
  SELECT 
    o.id,
    o.booking_id,
    o.operation_type,
    o.amount,
    o.created_at,
    'TEST OPERATION' as reason
  FROM operations o
  INNER JOIN test_bookings_preview tbp ON o.booking_id = tbp.id
),

test_payments_preview AS (
  SELECT 
    p.id,
    p.booking_id,
    p.amount,
    p.payment_method,
    p.created_at,
    'TEST PAYMENT' as reason
  FROM payments p
  INNER JOIN test_bookings_preview tbp ON p.booking_id = tbp.id
),

test_files_preview AS (
  SELECT 
    f.id,
    f.booking_id,
    f.file_name,
    f.created_at,
    'TEST FILE' as reason
  FROM booking_files f
  INNER JOIN test_bookings_preview tbp ON f.booking_id = tbp.id
)

-- Show preview of what will be deleted
SELECT '=== TEST BOOKINGS TO DELETE ===' as section, COUNT(*) as count FROM test_bookings_preview
UNION ALL
SELECT '=== TEST OPERATIONS TO DELETE ===', COUNT(*) FROM test_operations_preview
UNION ALL
SELECT '=== TEST PAYMENTS TO DELETE ===', COUNT(*) FROM test_payments_preview
UNION ALL
SELECT '=== TEST FILES TO DELETE ===', COUNT(*) FROM test_files_preview;

-- Show sample of bookings that will be deleted
SELECT * FROM (
  SELECT 
    b.id,
    b.client_name,
    b.phone,
    b.title,
    b.total_amount,
    b.created_at,
    CASE 
      WHEN LOWER(b.client_name) LIKE '%test%' THEN 'Name contains test'
      WHEN b.phone LIKE '%0000%' THEN 'Test phone number'
      WHEN b.total_amount < 50 THEN 'Low amount (test)'
      ELSE 'Other test pattern'
    END as deletion_reason
  FROM bookings b
  WHERE 
    LOWER(b.client_name) LIKE '%test%'
    OR LOWER(b.client_name) LIKE '%اختبار%'
    OR LOWER(b.client_name) LIKE '%تجربة%'
    OR b.phone LIKE '%0000%'
    OR b.phone LIKE '%1111%'
    OR b.total_amount < 50
  ORDER BY b.created_at DESC
  LIMIT 20
) preview;

-- ============================================
-- STEP 2: ACTUAL DELETION (UNCOMMENT TO EXECUTE)
-- ============================================

/*
-- Delete test files first (foreign key constraints)
DELETE FROM booking_files 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE LOWER(client_name) LIKE '%test%'
     OR LOWER(client_name) LIKE '%اختبار%'
     OR LOWER(client_name) LIKE '%تجربة%'
     OR phone LIKE '%0000%'
     OR phone LIKE '%1111%'
     OR total_amount < 50
);

-- Delete test payments
DELETE FROM payments 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE LOWER(client_name) LIKE '%test%'
     OR LOWER(client_name) LIKE '%اختبار%'
     OR LOWER(client_name) LIKE '%تجربة%'
     OR phone LIKE '%0000%'
     OR phone LIKE '%1111%'
     OR total_amount < 50
);

-- Delete test operations
DELETE FROM operations 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE LOWER(client_name) LIKE '%test%'
     OR LOWER(client_name) LIKE '%اختبار%'
     OR LOWER(client_name) LIKE '%تجربة%'
     OR phone LIKE '%0000%'
     OR phone LIKE '%1111%'
     OR total_amount < 50
);

-- Delete test booking notes/comments
DELETE FROM booking_notes 
WHERE booking_id IN (
  SELECT id FROM bookings 
  WHERE LOWER(client_name) LIKE '%test%'
     OR LOWER(client_name) LIKE '%اختبار%'
     OR LOWER(client_name) LIKE '%تجربة%'
     OR phone LIKE '%0000%'
     OR phone LIKE '%1111%'
     OR total_amount < 50
);

-- Delete test notifications
DELETE FROM notifications 
WHERE related_booking_id IN (
  SELECT id FROM bookings 
  WHERE LOWER(client_name) LIKE '%test%'
     OR LOWER(client_name) LIKE '%اختبار%'
     OR LOWER(client_name) LIKE '%تجربة%'
     OR phone LIKE '%0000%'
     OR phone LIKE '%1111%'
     OR total_amount < 50
);

-- Finally delete test bookings
DELETE FROM bookings 
WHERE LOWER(client_name) LIKE '%test%'
   OR LOWER(client_name) LIKE '%اختبار%'
   OR LOWER(client_name) LIKE '%تجربة%'
   OR phone LIKE '%0000%'
   OR phone LIKE '%1111%'
   OR total_amount < 50;

-- Show results
SELECT 'Cleanup completed successfully!' as status;
SELECT COUNT(*) as remaining_bookings FROM bookings;
*/

-- ============================================
-- STEP 3: ADDITIONAL CLEANUP (Optional)
-- ============================================

-- Clean up orphaned operations (operations without bookings)
/*
DELETE FROM operations 
WHERE booking_id NOT IN (SELECT id FROM bookings);
*/

-- Clean up orphaned payments
/*
DELETE FROM payments 
WHERE booking_id NOT IN (SELECT id FROM bookings);
*/

-- Clean up old notifications (older than 3 months)
/*
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '3 months';
*/

-- Reset sequences if needed (optional)
/*
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));
*/

-- COMMIT; -- Uncomment when ready to commit
