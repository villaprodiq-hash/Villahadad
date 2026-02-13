-- ============================================================================
-- 🔍 Villa Hadad RLS Verification Script
-- ============================================================================
-- Run this script in Supabase SQL Editor to verify RLS is working correctly
-- https://app.supabase.com/project/YOUR_PROJECT/sql
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if RLS is enabled on all tables
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('bookings', 'users', 'expenses', 'payments', 'messages', 'activity_logs')
ORDER BY tablename;

-- Expected: All tables should show "true" in "RLS Enabled" column
-- ❌ If any show "false", run: ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: List all existing policies
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as "Operation",
    qual as "USING clause"
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 3: Test as different roles
-- ============================================================================

-- 🔵 Test as MANAGER (should see ALL bookings)
-- SET request.jwt.claims = '{"user_metadata": {"role": "manager"}}';
-- SELECT COUNT(*) as "Manager sees" FROM bookings;

-- 🟢 Test as RECEPTION (should see only FUTURE bookings)
-- SET request.jwt.claims = '{"user_metadata": {"role": "reception"}}';
-- SELECT COUNT(*) as "Reception sees" FROM bookings WHERE shoot_date >= CURRENT_DATE;

-- 🟡 Test as PHOTO_EDITOR (should see only EDITING status)
-- SET request.jwt.claims = '{"user_metadata": {"role": "photo_editor"}}';
-- SELECT COUNT(*) as "Photo Editor sees" FROM bookings WHERE status IN ('Editing', 'EDITING', 'Ready to Print');

-- 🟠 Test as PRINTER (should see only PRINT-READY status)
-- SET request.jwt.claims = '{"user_metadata": {"role": "printer"}}';
-- SELECT COUNT(*) as "Printer sees" FROM bookings WHERE status IN ('Ready to Print', 'Printing');

-- ============================================================================
-- STEP 4: Verify function exists
-- ============================================================================

SELECT 
    routine_name,
    routine_type,
    data_type as "Returns"
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_role';

-- Expected: Should show get_user_role function returning TEXT

-- ============================================================================
-- STEP 5: Test the helper function
-- ============================================================================

-- Test with mock JWT
-- SET request.jwt.claims = '{"user_metadata": {"role": "reception"}}';
-- SELECT public.get_user_role() as "Detected Role";

-- ============================================================================
-- STEP 6: Count policies per table
-- ============================================================================

SELECT 
    tablename,
    COUNT(*) as "Policy Count"
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected policy counts:
-- bookings: 10-14 policies
-- users: 4-6 policies
-- expenses: 3-4 policies
-- payments: 3-4 policies
-- messages: 6-8 policies
-- activity_logs: 2 policies

-- ============================================================================
-- 🔴 IMPORTANT: If RLS is NOT enabled, run this:
-- ============================================================================

/*
-- Uncomment and run if needed:

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Then apply policies from: scripts/rls-policies.sql
*/

-- ============================================================================
-- STEP 7: Security Audit Summary
-- ============================================================================

SELECT 
    '📊 RLS Verification Complete' as "Status",
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as "Total Policies",
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as "Tables with RLS"
;
