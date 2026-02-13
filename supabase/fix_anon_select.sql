-- ============================================================================
-- Fix RLS to allow anonymous users to SELECT users
-- ============================================================================

-- Drop existing select policy
DROP POLICY IF EXISTS "Allow authenticated users to select users" ON users;

-- Create new policy that allows BOTH authenticated AND anonymous users
CREATE POLICY "Allow all users to select users"
ON users FOR SELECT
TO PUBLIC
USING (true);

-- ============================================================================
-- Verify the fix
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users';
