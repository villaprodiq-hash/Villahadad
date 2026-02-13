-- ============================================
-- Fix Users Delete RLS Policy
-- Issue: Anonymous users cannot UPDATE (soft delete)
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all users to select users" ON users;
DROP POLICY IF EXISTS "Allow anonymous delete" ON users;
DROP POLICY IF EXISTS "Allow authenticated delete" ON users;
DROP POLICY IF EXISTS "Allow all users to update deleted_at" ON users;
DROP POLICY IF EXISTS "Allow all operations on users" ON users;

-- Create comprehensive policy that allows all operations for PUBLIC
-- This is needed because the app uses anon key for all operations
CREATE POLICY "Allow all operations on users"
ON users
FOR ALL
TO PUBLIC
USING (true)
WITH CHECK (true);

-- Verify the policy
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users'
AND schemaname = 'public';
