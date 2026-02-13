-- ============================================================================
-- Fix Row Level Security (RLS) Policies for users table
-- ============================================================================
-- This fixes the 401 Unauthorized error when adding users
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to select users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to delete users" ON users;
DROP POLICY IF EXISTS "Allow anon to insert users" ON users;

-- ============================================================================
-- SELECT Policy: Allow authenticated users to read all users
-- ============================================================================
CREATE POLICY "Allow authenticated users to select users"
ON users FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- INSERT Policy: Allow authenticated users to add new users
-- ============================================================================
CREATE POLICY "Allow authenticated users to insert users"
ON users FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also allow anon (for initial setup/registration if needed)
CREATE POLICY "Allow anon to insert users"
ON users FOR INSERT
TO anon
WITH CHECK (true);

-- ============================================================================
-- UPDATE Policy: Allow authenticated users to update users
-- ============================================================================
CREATE POLICY "Allow authenticated users to update users"
ON users FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================================================
-- DELETE Policy: Allow authenticated users to delete users
-- ============================================================================
CREATE POLICY "Allow authenticated users to delete users"
ON users FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- Verify policies were created
-- ============================================================================
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
WHERE tablename = 'users';
