-- ============================================
-- Fix Bookings RLS Policy
-- Issue: Anonymous users cannot SELECT bookings
-- ============================================

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow anonymous select on bookings" ON bookings;
DROP POLICY IF EXISTS "Allow authenticated full access on bookings" ON bookings;

-- Create policy that allows ALL operations for PUBLIC
-- This is needed because the desktop app uses anon key
CREATE POLICY "Allow all operations on bookings"
ON bookings
FOR ALL
TO PUBLIC
USING (true)
WITH CHECK (true);

-- Alternative: More restrictive policies (if you want security)
-- Uncomment these and comment the above if you want stricter control:

-- Allow everyone to read bookings
-- CREATE POLICY "Allow anonymous select on bookings"
-- ON bookings FOR SELECT TO PUBLIC USING (true);

-- Allow everyone to create/update/delete (for desktop app)
-- CREATE POLICY "Allow all modifications on bookings"  
-- ON bookings FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- ============================================
-- Also fix client_transactions table if exists
-- ============================================
ALTER TABLE IF EXISTS client_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on client_transactions" ON client_transactions;
CREATE POLICY "Allow all on client_transactions"
ON client_transactions FOR ALL TO PUBLIC USING (true) WITH CHECK (true);

-- ============================================
-- Verify policies
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('bookings', 'users', 'client_transactions')
AND schemaname = 'public';
