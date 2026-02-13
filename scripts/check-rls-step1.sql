-- =============================================
-- Villa Hadad RLS Verification Script
-- Run in Supabase SQL Editor
-- =============================================

-- STEP 1: Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('bookings', 'users', 'expenses', 'payments', 'messages', 'activity_logs')
ORDER BY tablename;
