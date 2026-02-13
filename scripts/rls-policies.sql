-- ============================================================================
-- Villa Hadad Row Level Security (RLS) Policies (MASTER CONSOLIDATED v5)
-- ============================================================================
-- Enterprise-Grade Security Layer for Multi-Role Access Control
--
-- Roles: ADMIN, MANAGER, RECEPTION, PHOTO_EDITOR, VIDEO_EDITOR, PRINTER, SELECTOR
-- Strategy: ONE POLICY PER ACTION (SELECT, INSERT, UPDATE, DELETE)
--           This eliminates "Multiple Permissive Policies" warnings (Lint 0006).
-- Idempotency: ALL policies are explicitly dropped before creation.
--
-- CRITICAL: Run this AFTER '20260131_fix_security.sql'
-- ============================================================================

-- Helper function (ensure cached via sub-selects in policies)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'user_metadata')::json->>'role',
    (current_setting('request.jwt.claims', true)::json->>'app_metadata')::json->>'role',
    'authenticated' -- Default to authenticated but no specific role
  )::TEXT;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
-- Clean up NEW policy names (for re-runs)
DROP POLICY IF EXISTS "bookings_select_policy" ON bookings;
DROP POLICY IF EXISTS "bookings_insert_policy" ON bookings;
DROP POLICY IF EXISTS "bookings_update_policy" ON bookings;
DROP POLICY IF EXISTS "bookings_delete_policy" ON bookings;
-- Clean up OLD/INTERMEDIATE policy names
DROP POLICY IF EXISTS "admin_manager_all_bookings" ON bookings;
DROP POLICY IF EXISTS "staff_read_bookings" ON bookings;
DROP POLICY IF EXISTS "staff_update_bookings" ON bookings;
DROP POLICY IF EXISTS "staff_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "admin_all_bookings" ON bookings;
DROP POLICY IF EXISTS "manager_all_bookings" ON bookings;
DROP POLICY IF EXISTS "reception_future_bookings" ON bookings;
DROP POLICY IF EXISTS "reception_insert_bookings" ON bookings;
DROP POLICY IF EXISTS "reception_update_bookings" ON bookings;
DROP POLICY IF EXISTS "photo_editor_assigned_bookings" ON bookings;
DROP POLICY IF EXISTS "photo_editor_update_bookings" ON bookings;
DROP POLICY IF EXISTS "video_editor_assigned_bookings" ON bookings;
DROP POLICY IF EXISTS "video_editor_update_bookings" ON bookings;
DROP POLICY IF EXISTS "printer_print_ready_bookings" ON bookings;
DROP POLICY IF EXISTS "printer_update_bookings" ON bookings;
DROP POLICY IF EXISTS "selector_selection_bookings" ON bookings;
DROP POLICY IF EXISTS "selector_update_bookings" ON bookings;

-- 1. SELECT (All Roles)
CREATE POLICY "bookings_select_policy" ON bookings
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR CASE (select public.get_user_role())
      WHEN 'reception' THEN (shoot_date::DATE >= CURRENT_DATE AND deleted_at IS NULL)
      WHEN 'photo_editor' THEN (status IN ('Editing', 'Ready to Print', 'q_editing', 'EDITING') AND deleted_at IS NULL)
      WHEN 'video_editor' THEN (status IN ('Editing', 'Montage Completed', 'q_editing', 'EDITING') AND deleted_at IS NULL)
      WHEN 'printer' THEN (status IN ('Ready to Print', 'Printing') AND deleted_at IS NULL)
      WHEN 'selector' THEN (status IN ('Selection', 'SELECTION', 'q_selection') AND deleted_at IS NULL)
      ELSE false
    END
  );

-- 2. INSERT (Admin, Manager, Reception)
CREATE POLICY "bookings_insert_policy" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR ((select public.get_user_role()) = 'reception' AND shoot_date::DATE >= CURRENT_DATE)
  );

-- 3. UPDATE (All Roles)
CREATE POLICY "bookings_update_policy" ON bookings
  FOR UPDATE TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR CASE (select public.get_user_role())
      WHEN 'reception' THEN (shoot_date::DATE >= CURRENT_DATE)
      WHEN 'photo_editor' THEN status IN ('Editing', 'Ready to Print', 'q_editing', 'EDITING')
      WHEN 'video_editor' THEN status IN ('Editing', 'Montage Completed', 'q_editing', 'EDITING')
      WHEN 'printer' THEN status IN ('Ready to Print', 'Printing')
      WHEN 'selector' THEN status IN ('Selection', 'SELECTION', 'q_selection')
      ELSE false
    END
  )
  WITH CHECK (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR CASE (select public.get_user_role())
      WHEN 'reception' THEN (shoot_date::DATE >= CURRENT_DATE)
      WHEN 'photo_editor' THEN status IN ('Editing', 'Ready to Print', 'q_editing', 'EDITING')
      WHEN 'video_editor' THEN status IN ('Editing', 'Montage Completed', 'q_editing', 'EDITING')
      WHEN 'printer' THEN status IN ('Ready to Print', 'Printing', 'Delivered')
      WHEN 'selector' THEN status IN ('Selection', 'SELECTION', 'Editing', 'q_selection', 'q_editing')
      ELSE false
    END
  );

-- 4. DELETE (Admin, Manager Only)
CREATE POLICY "bookings_delete_policy" ON bookings
  FOR DELETE TO authenticated
  USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- EXPENSES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "expenses_select_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON expenses;
DROP POLICY IF EXISTS "expenses_write_policy" ON expenses;
-- Old
DROP POLICY IF EXISTS "admin_manager_all_expenses" ON expenses;
DROP POLICY IF EXISTS "staff_read_expenses" ON expenses;
DROP POLICY IF EXISTS "admin_all_expenses" ON expenses;
DROP POLICY IF EXISTS "manager_all_expenses" ON expenses;
DROP POLICY IF EXISTS "reception_read_expenses" ON expenses;

-- 1. SELECT
CREATE POLICY "expenses_select_policy" ON expenses
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR ((select public.get_user_role()) = 'reception' AND deleted_at IS NULL)
  );

-- 2. INSERT
CREATE POLICY "expenses_insert_policy" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 3. UPDATE
CREATE POLICY "expenses_update_policy" ON expenses
  FOR UPDATE TO authenticated
  USING ((select public.get_user_role()) IN ('admin', 'manager'))
  WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 4. DELETE
CREATE POLICY "expenses_delete_policy" ON expenses
  FOR DELETE TO authenticated
  USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- USERS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "users_insert_delete_policy" ON users;
-- Old
DROP POLICY IF EXISTS "admin_manager_all_users" ON users;
DROP POLICY IF EXISTS "staff_read_users" ON users;
DROP POLICY IF EXISTS "staff_update_own_profile" ON users;
DROP POLICY IF EXISTS "admin_all_users" ON users;
DROP POLICY IF EXISTS "manager_all_users" ON users;
DROP POLICY IF EXISTS "reception_team_users" ON users;
DROP POLICY IF EXISTS "staff_own_profile" ON users;

-- 1. SELECT
CREATE POLICY "users_select_policy" ON users
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR CASE (select public.get_user_role())
      WHEN 'reception' THEN deleted_at IS NULL
      WHEN 'photo_editor' THEN id = (select auth.uid())::TEXT
      WHEN 'video_editor' THEN id = (select auth.uid())::TEXT
      WHEN 'printer' THEN id = (select auth.uid())::TEXT
      WHEN 'selector' THEN id = (select auth.uid())::TEXT
      ELSE false
    END
  );

-- 2. UPDATE (Admin/Manager + Staff Own)
CREATE POLICY "users_update_policy" ON users
  FOR UPDATE TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (
      (select public.get_user_role()) IN ('photo_editor', 'video_editor', 'printer', 'selector')
      AND id = (select auth.uid())::TEXT
    )
  )
  WITH CHECK (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (
      (select public.get_user_role()) IN ('photo_editor', 'video_editor', 'printer', 'selector')
      AND id = (select auth.uid())::TEXT
    )
  );

-- 3. INSERT
CREATE POLICY "users_insert_policy" ON users
  FOR INSERT TO authenticated
  WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 4. DELETE
CREATE POLICY "users_delete_policy" ON users
  FOR DELETE TO authenticated
  USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "messages_select_policy" ON messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON messages;
DROP POLICY IF EXISTS "messages_update_policy" ON messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON messages;
DROP POLICY IF EXISTS "messages_modify_policy" ON messages;
-- Old
DROP POLICY IF EXISTS "Anyone can read global messages and their DMs" ON messages;
DROP POLICY IF EXISTS "admin_manager_all_messages" ON messages;
DROP POLICY IF EXISTS "staff_read_messages" ON messages;
DROP POLICY IF EXISTS "staff_insert_messages" ON messages;
DROP POLICY IF EXISTS "admin_all_messages" ON messages;
DROP POLICY IF EXISTS "manager_all_messages" ON messages;
DROP POLICY IF EXISTS "reception_team_messages" ON messages;
DROP POLICY IF EXISTS "reception_send_messages" ON messages;
DROP POLICY IF EXISTS "editors_team_messages" ON messages;
DROP POLICY IF EXISTS "editors_send_messages" ON messages;
DROP POLICY IF EXISTS "staff_own_messages" ON messages;
DROP POLICY IF EXISTS "staff_send_messages" ON messages;

-- 1. SELECT
CREATE POLICY "messages_select_policy" ON messages
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR CASE (select public.get_user_role())
      WHEN 'reception' THEN (
        sender_id = (select auth.uid())::TEXT 
        OR recipient_id = (select auth.uid())::TEXT
        OR recipient_id IS NULL
      )
      WHEN 'photo_editor' THEN (
         sender_id = (select auth.uid())::TEXT
         OR recipient_id = (select auth.uid())::TEXT
         OR sender_role IN ('manager', 'admin', 'photo_editor', 'video_editor')
      )
      WHEN 'video_editor' THEN (
         sender_id = (select auth.uid())::TEXT
         OR recipient_id = (select auth.uid())::TEXT
         OR sender_role IN ('manager', 'admin', 'photo_editor', 'video_editor')
      )
      WHEN 'printer' THEN (
        sender_id = (select auth.uid())::TEXT
        OR recipient_id = (select auth.uid())::TEXT
      )
      WHEN 'selector' THEN (
        sender_id = (select auth.uid())::TEXT
        OR recipient_id = (select auth.uid())::TEXT
      )
      ELSE false
    END
  );

-- 2. INSERT
CREATE POLICY "messages_insert_policy" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (
      sender_id = (select auth.uid())::TEXT
      AND (select public.get_user_role()) IN ('reception', 'photo_editor', 'video_editor', 'printer', 'selector')
    )
  );

-- 3. UPDATE
CREATE POLICY "messages_update_policy" ON messages 
  FOR UPDATE TO authenticated
  USING ((select public.get_user_role()) IN ('admin', 'manager'))
  WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 4. DELETE
CREATE POLICY "messages_delete_policy" ON messages
  FOR DELETE TO authenticated
  USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON payments;
-- Old
DROP POLICY IF EXISTS "admin_manager_all_payments" ON payments;
DROP POLICY IF EXISTS "staff_read_payments" ON payments;
DROP POLICY IF EXISTS "staff_insert_payments" ON payments;
DROP POLICY IF EXISTS "admin_all_payments" ON payments;
DROP POLICY IF EXISTS "payments_admin_select" ON payments;
DROP POLICY IF EXISTS "manager_all_payments" ON payments;
DROP POLICY IF EXISTS "reception_read_payments" ON payments;
DROP POLICY IF EXISTS "reception_insert_payments" ON payments;

-- 1. SELECT
CREATE POLICY "payments_select_policy" ON payments
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR ((select public.get_user_role()) = 'reception' AND deleted_at IS NULL)
  );

-- 2. INSERT
CREATE POLICY "payments_insert_policy" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.get_user_role()) IN ('admin', 'manager', 'reception')
  );

-- 3. UPDATE
CREATE POLICY "payments_update_policy" ON payments FOR UPDATE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'))
WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 4. DELETE
CREATE POLICY "payments_delete_policy" ON payments FOR DELETE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- ACTIVITY LOGS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "activity_logs_select_policy" ON activity_logs;
-- Old
DROP POLICY IF EXISTS "admin_manager_all_activity_logs" ON activity_logs;
DROP POLICY IF EXISTS "admin_all_logs" ON activity_logs;
DROP POLICY IF EXISTS "manager_all_logs" ON activity_logs;
DROP POLICY IF EXISTS "Managers can view logs" ON activity_logs;

CREATE POLICY "activity_logs_select_policy" ON activity_logs
  FOR SELECT TO authenticated
  USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- CONFLICTS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "conflicts_select_policy" ON conflicts;
DROP POLICY IF EXISTS "conflicts_insert_policy" ON conflicts;
DROP POLICY IF EXISTS "conflicts_update_policy" ON conflicts;
DROP POLICY IF EXISTS "conflicts_delete_policy" ON conflicts;
-- Old
DROP POLICY IF EXISTS "conflicts_manager_all" ON conflicts;
DROP POLICY IF EXISTS "conflicts_staff_select" ON conflicts;
DROP POLICY IF EXISTS "conflicts_staff_insert" ON conflicts;
DROP POLICY IF EXISTS "Allow authenticated read on conflicts" ON conflicts;
DROP POLICY IF EXISTS "Authenticated users can read conflicts" ON conflicts;

-- 1. SELECT
CREATE POLICY "conflicts_select_policy" ON conflicts
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (select auth.uid()) IS NOT NULL 
  );

-- 2. INSERT
CREATE POLICY "conflicts_insert_policy" ON conflicts
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- 3. UPDATE
CREATE POLICY "conflicts_update_policy" ON conflicts FOR UPDATE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'))
WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 4. DELETE
CREATE POLICY "conflicts_delete_policy" ON conflicts FOR DELETE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- TASKS TABLE
-- ============================================================================
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_write_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
-- Old
DROP POLICY IF EXISTS "tasks_manager_all" ON tasks;
DROP POLICY IF EXISTS "tasks_staff_view" ON tasks;
DROP POLICY IF EXISTS "Anyone can read tasks" ON tasks;

-- 1. SELECT
CREATE POLICY "tasks_select_policy" ON tasks
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (select public.get_user_role()) IN ('photo_editor', 'video_editor', 'printer', 'selector', 'reception')
  );

-- 2. INSERT
CREATE POLICY "tasks_insert_policy" ON tasks FOR INSERT TO authenticated
WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 3. UPDATE
CREATE POLICY "tasks_update_policy" ON tasks FOR UPDATE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'))
WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 4. DELETE
CREATE POLICY "tasks_delete_policy" ON tasks FOR DELETE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- LEAVES TABLE
-- ============================================================================
DROP POLICY IF EXISTS "leaves_select_policy" ON leaves;
DROP POLICY IF EXISTS "leaves_insert_policy" ON leaves;
DROP POLICY IF EXISTS "leaves_update_policy" ON leaves;
DROP POLICY IF EXISTS "leaves_delete_policy" ON leaves;
-- Old
DROP POLICY IF EXISTS "leaves_manager_all" ON leaves;
DROP POLICY IF EXISTS "leaves_staff_insert" ON leaves;
DROP POLICY IF EXISTS "leaves_staff_view_own" ON leaves;
DROP POLICY IF EXISTS "Users can view their own leaves" ON leaves;

-- 1. SELECT
CREATE POLICY "leaves_select_policy" ON leaves
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (select auth.uid()) = user_id
  );

-- 2. INSERT
CREATE POLICY "leaves_insert_policy" ON leaves
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (select auth.uid()) = user_id
  );

-- 3. UPDATE
CREATE POLICY "leaves_update_policy" ON leaves FOR UPDATE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'))
WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 4. DELETE
CREATE POLICY "leaves_delete_policy" ON leaves FOR DELETE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- DAILY ATTENDANCE TABLE
-- ============================================================================
DROP POLICY IF EXISTS "attendance_select_policy" ON daily_attendance;
DROP POLICY IF EXISTS "attendance_insert_policy" ON daily_attendance;
DROP POLICY IF EXISTS "attendance_update_policy" ON daily_attendance;
DROP POLICY IF EXISTS "attendance_delete_policy" ON daily_attendance;
-- Old
DROP POLICY IF EXISTS "attendance_manager_all" ON daily_attendance;
DROP POLICY IF EXISTS "attendance_staff_insert_own" ON daily_attendance;
DROP POLICY IF EXISTS "attendance_staff_view_own" ON daily_attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON daily_attendance;

-- 1. SELECT
CREATE POLICY "attendance_select_policy" ON daily_attendance
  FOR SELECT TO authenticated
  USING (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (select auth.uid()) = user_id
  );

-- 2. INSERT
CREATE POLICY "attendance_insert_policy" ON daily_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    (select public.get_user_role()) IN ('admin', 'manager')
    OR (select auth.uid()) = user_id
  );

-- 3. UPDATE
CREATE POLICY "attendance_update_policy" ON daily_attendance FOR UPDATE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'))
WITH CHECK ((select public.get_user_role()) IN ('admin', 'manager'));

-- 4. DELETE
CREATE POLICY "attendance_delete_policy" ON daily_attendance FOR DELETE TO authenticated
USING ((select public.get_user_role()) IN ('admin', 'manager'));


-- ============================================================================
-- FINAL CHECK
-- ============================================================================
-- Ensure RLS is on
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
