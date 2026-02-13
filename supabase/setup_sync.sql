-- ============================================
-- 🔄 VillaHadad Supabase Sync Setup
-- ============================================
-- هذا الملف يحتوي على الإعدادات اللازمة لتمكين المزامنة
-- قم بتشغيل هذه الأوامر في SQL Editor في Supabase Dashboard
-- ============================================

-- ============================================
-- 1. تفعيل Realtime للجداول المهمة
-- ============================================

-- تفعيل Realtime لجدول bookings (idempotent - safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END$$;

-- تفعيل Realtime لجدول users (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END$$;

-- تفعيل Realtime لجدول payments (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_class c ON pr.prrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_publication p ON pr.prpubid = p.oid
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END$$;

-- ============================================
-- 2. إعداد سياسات RLS (Row Level Security)
-- ============================================

-- تمكين RLS على الجداول
alter table bookings enable row level security;
alter table users enable row level security;
alter table payments enable row level security;

-- ============================================
-- 3. سياسات للمستخدمين المصادق عليهم (idempotent)
-- ============================================

-- السماح للمستخدمين المصادق عليهم بقراءة جميع الحجوزات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'Authenticated users can read all bookings'
  ) THEN
    CREATE POLICY "Authenticated users can read all bookings"
    ON bookings FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;

-- السماح للمستخدمين المصادق عليهم بإنشاء حجوزات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'Authenticated users can create bookings'
  ) THEN
    CREATE POLICY "Authenticated users can create bookings"
    ON bookings FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END$$;

-- السماح للمستخدمين المصادق عليهم بتحديث الحجوزات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'Authenticated users can update bookings'
  ) THEN
    CREATE POLICY "Authenticated users can update bookings"
    ON bookings FOR UPDATE
    TO authenticated
    USING (true);
  END IF;
END$$;

-- السماح للمستخدمين المصادق عليهم بحذف الحجوزات (soft delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'bookings' 
    AND policyname = 'Authenticated users can soft delete bookings'
  ) THEN
    CREATE POLICY "Authenticated users can soft delete bookings"
    ON bookings FOR DELETE
    TO authenticated
    USING (true);
  END IF;
END$$;

-- ============================================
-- 4. سياسات لجدول users (idempotent)
-- ============================================

-- السماح للمستخدمين المصادق عليهم بقراءة جميع المستخدمين
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Authenticated users can read all users'
  ) THEN
    CREATE POLICY "Authenticated users can read all users"
    ON users FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;

-- السماح للمستخدمين المصادق عليهم بتحديث بياناتهم
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can update their own data'
  ) THEN
    CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id);
  END IF;
END$$;

-- ============================================
-- 5. سياسات لجدول payments (idempotent)
-- ============================================

-- السماح للمستخدمين المصادق عليهم بقراءة جميع المدفوعات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Authenticated users can read all payments'
  ) THEN
    CREATE POLICY "Authenticated users can read all payments"
    ON payments FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;

-- السماح للمستخدمين المصادق عليهم بإنشاء مدفوعات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Authenticated users can create payments'
  ) THEN
    CREATE POLICY "Authenticated users can create payments"
    ON payments FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END$$;

-- السماح للمستخدمين المصادق عليهم بتحديث المدفوعات
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payments' 
    AND policyname = 'Authenticated users can update payments'
  ) THEN
    CREATE POLICY "Authenticated users can update payments"
    ON payments FOR UPDATE
    TO authenticated
    USING (true);
  END IF;
END$$;

-- ============================================
-- 6. إنشاء جدول conflicts للتعامل مع تعارضات المزامنة
-- ============================================
CREATE TABLE IF NOT EXISTS conflicts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id TEXT NOT NULL,
  proposed_by_name TEXT NOT NULL,
  proposed_by_rank TEXT NOT NULL,
  proposed_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT
);

-- تمكين RLS على جدول conflicts
alter table conflicts enable row level security;

-- سياسات لجدول conflicts (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'conflicts' 
    AND policyname = 'Authenticated users can read all conflicts'
  ) THEN
    CREATE POLICY "Authenticated users can read all conflicts"
    ON conflicts FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'conflicts' 
    AND policyname = 'Authenticated users can create conflicts'
  ) THEN
    CREATE POLICY "Authenticated users can create conflicts"
    ON conflicts FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'conflicts' 
    AND policyname = 'Authenticated users can update conflicts'
  ) THEN
    CREATE POLICY "Authenticated users can update conflicts"
    ON conflicts FOR UPDATE
    TO authenticated
    USING (true);
  END IF;
END$$;
