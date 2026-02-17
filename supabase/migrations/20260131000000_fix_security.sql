-- ============================================================================
-- SECURITY FIXES & HARDENING (2026-01-31) - REVISED v4 (IDEMPOTENT & OPTIMIZED)
-- ============================================================================
-- Addresses Supabase Linting Issues:
-- 1. Mutable Function Search Paths (Security Risk)
-- 2. Permissive RLS Policies (Privacy Risk)
-- 3. RLS Performance (auth_rls_initplan) - Added (SELECT ...) caching
-- 4. Idempotency - Added DROP POLICY IF EXISTS for all created policies
-- ============================================================================
-- ----------------------------------------------------------------------------
-- 1. FIX FUNCTION SEARCH PATHS
-- ----------------------------------------------------------------------------
-- Prevents "search_path" hijacking attacks by forcing "public" schema.
ALTER FUNCTION public.soft_delete_booking
SET
    search_path = public;

ALTER FUNCTION public.update_updated_at_column
SET
    search_path = public;

ALTER FUNCTION public.cleanup_old_sync_queue
SET
    search_path = public;

ALTER FUNCTION public.get_user_role
SET
    search_path = public;

-- ----------------------------------------------------------------------------
-- 2. REMOVE PERMISSIVE / INSECURE POLICIES
-- ----------------------------------------------------------------------------
-- We drop ALL known previous policies to perform a clean slate update.
-- Bookings
DROP POLICY IF EXISTS "Allow All Bookings" ON bookings;

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON bookings;

DROP POLICY IF EXISTS "Authenticated users can soft delete bookings" ON bookings;

DROP POLICY IF EXISTS "Authenticated users can update bookings" ON bookings;

DROP POLICY IF EXISTS "Authenticated users can read all bookings" ON bookings;

DROP POLICY IF EXISTS "admin_all_bookings" ON bookings;

DROP POLICY IF EXISTS "manager_all_bookings" ON bookings;

-- Payments
DROP POLICY IF EXISTS "Allow All Payments" ON payments;

DROP POLICY IF EXISTS "Authenticated users can create payments" ON payments;

DROP POLICY IF EXISTS "Authenticated users can update payments" ON payments;

DROP POLICY IF EXISTS "Authenticated users can read all payments" ON payments;

DROP POLICY IF EXISTS "admin_all_payments" ON payments;

DROP POLICY IF EXISTS "manager_all_payments" ON payments;

-- Users
DROP POLICY IF EXISTS "Allow All Users" ON users;

DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;

DROP POLICY IF EXISTS "Users can update their own data" ON users;

DROP POLICY IF EXISTS "admin_all_users" ON users;

DROP POLICY IF EXISTS "manager_all_users" ON users;

-- Conflicts
DROP POLICY IF EXISTS "Allow Managers Manage Conflicts" ON conflicts;

DROP POLICY IF EXISTS "Allow Staff Insert Conflicts" ON conflicts;

DROP POLICY IF EXISTS "Allow authenticated update on conflicts" ON conflicts;

DROP POLICY IF EXISTS "Authenticated users can create conflicts" ON conflicts;

DROP POLICY IF EXISTS "Authenticated users can update conflicts" ON conflicts;

DROP POLICY IF EXISTS "Authenticated users can read all conflicts" ON conflicts;

-- Clean up the target policies we are about to create (to prevent "already exists" error)
DROP POLICY IF EXISTS "conflicts_manager_all" ON conflicts;

DROP POLICY IF EXISTS "conflicts_staff_insert" ON conflicts;

DROP POLICY IF EXISTS "conflicts_staff_select" ON conflicts;

DROP POLICY IF EXISTS "tasks_manager_all" ON tasks;

DROP POLICY IF EXISTS "tasks_staff_view" ON tasks;

DROP POLICY IF EXISTS "leaves_manager_all" ON leaves;

DROP POLICY IF EXISTS "leaves_staff_insert" ON leaves;

DROP POLICY IF EXISTS "leaves_staff_view_own" ON leaves;

DROP POLICY IF EXISTS "attendance_manager_all" ON daily_attendance;

DROP POLICY IF EXISTS "attendance_staff_view_own" ON daily_attendance;

DROP POLICY IF EXISTS "attendance_staff_insert_own" ON daily_attendance;

-- Other Tables (Clean up generic permissive policies)
DROP POLICY IF EXISTS "Everyone can insert logs" ON activity_logs;

DROP POLICY IF EXISTS "Allow authenticated insert on add_ons" ON add_ons;

DROP POLICY IF EXISTS "Allow authenticated update on add_ons" ON add_ons;

DROP POLICY IF EXISTS "Allow authenticated insert on client_transactions" ON client_transactions;

DROP POLICY IF EXISTS "Allow authenticated update on client_transactions" ON client_transactions;

DROP POLICY IF EXISTS "System/Managers can insert/update attendance" ON daily_attendance;

DROP POLICY IF EXISTS "Managers can update leaves" ON leaves;

DROP POLICY IF EXISTS "Users can create their own leaves" ON leaves;

DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;

DROP POLICY IF EXISTS "Allow All Audit" ON staff_audit_trail;

DROP POLICY IF EXISTS "Authenticated users can manage tasks" ON tasks;

-- ----------------------------------------------------------------------------
-- 3. APPLY STRICT POLICIES FOR UNCOVERED TABLES
-- ----------------------------------------------------------------------------
-- Applies (SELECT ...) optimization for better performance.
-- CONFLICTS: Managers resolve, Staff can report
CREATE POLICY "conflicts_manager_all" ON conflicts FOR ALL TO authenticated USING (
    (
        select
            public.get_user_role ()
    ) IN ('admin', 'manager')
)
WITH
    CHECK (
        (
            select
                public.get_user_role ()
        ) IN ('admin', 'manager')
    );

CREATE POLICY "conflicts_staff_insert" ON conflicts FOR INSERT TO authenticated
WITH
    CHECK (
        (
            select
                auth.role ()
        ) = 'authenticated'
    );

CREATE POLICY "conflicts_staff_select" ON conflicts FOR
SELECT
    TO authenticated USING (
        (
            select
                auth.role ()
        ) = 'authenticated'
    );

-- TASKS: Managers manage, Staff view/update status
CREATE POLICY "tasks_manager_all" ON tasks FOR ALL TO authenticated USING (
    (
        select
            public.get_user_role ()
    ) IN ('admin', 'manager')
)
WITH
    CHECK (
        (
            select
                public.get_user_role ()
        ) IN ('admin', 'manager')
    );

CREATE POLICY "tasks_staff_view" ON tasks FOR
SELECT
    TO authenticated USING (
        (
            select
                public.get_user_role ()
        ) IN (
            'photo_editor',
            'video_editor',
            'printer',
            'selector',
            'reception'
        )
    );

-- LEAVES: Managers manage, Staff insert own
CREATE POLICY "leaves_manager_all" ON leaves FOR ALL TO authenticated USING (
    (
        select
            public.get_user_role ()
    ) IN ('admin', 'manager')
)
WITH
    CHECK (
        (
            select
                public.get_user_role ()
        ) IN ('admin', 'manager')
    );

CREATE POLICY "leaves_staff_insert" ON leaves FOR INSERT TO authenticated
WITH
    CHECK (
        (
            select
                auth.uid ()
        ) = user_id
    );

CREATE POLICY "leaves_staff_view_own" ON leaves FOR
SELECT
    TO authenticated USING (
        (
            select
                auth.uid ()
        ) = user_id
    );

-- DAILY ATTENDANCE: Managers manage, Staff view own
CREATE POLICY "attendance_manager_all" ON daily_attendance FOR ALL TO authenticated USING (
    (
        select
            public.get_user_role ()
    ) IN ('admin', 'manager')
)
WITH
    CHECK (
        (
            select
                public.get_user_role ()
        ) IN ('admin', 'manager')
    );

CREATE POLICY "attendance_staff_view_own" ON daily_attendance FOR
SELECT
    TO authenticated USING (
        (
            select
                auth.uid ()
        ) = user_id
    );

CREATE POLICY "attendance_staff_insert_own" ON daily_attendance FOR INSERT TO authenticated
WITH
    CHECK (
        (
            select
                auth.uid ()
        ) = user_id
    );

-- ----------------------------------------------------------------------------
-- 4. REMINDER
-- ----------------------------------------------------------------------------
-- After running this script, please run 'villahadadMacos/scripts/rls-policies.sql'
-- to ensure the core tables (bookings, users, payments) have the correct
-- role-based policies re-applied (since we dropped the permissive ones).