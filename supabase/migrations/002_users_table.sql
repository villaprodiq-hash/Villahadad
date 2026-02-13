-- ============================================
-- Villa Hadad - Users Table for Supabase
-- نفذ هذا الكود في SQL Editor في Supabase
-- https://supabase.com/dashboard/project/rszxfllrxmqphmginklv/sql/new
-- ============================================

-- 1. إنشاء جدول المستخدمين
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'RECEPTION',
    password TEXT,
    job_title TEXT,
    avatar TEXT,
    email TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 2. إنشاء Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON public.users(deleted_at);

-- 3. تفعيل Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. حذف Policies القديمة (إذا موجودة)
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
DROP POLICY IF EXISTS "Allow public insert access" ON public.users;
DROP POLICY IF EXISTS "Allow public update access" ON public.users;
DROP POLICY IF EXISTS "Allow public delete access" ON public.users;

-- 5. إنشاء Policy للقراءة (كل الأجهزة تقدر تقرأ)
CREATE POLICY "Allow public read access" ON public.users
    FOR SELECT
    USING (deleted_at IS NULL);

-- 6. إنشاء Policy للكتابة (كل الأجهزة تقدر تكتب)
CREATE POLICY "Allow public insert access" ON public.users
    FOR INSERT
    WITH CHECK (true);

-- 7. إنشاء Policy للتحديث
CREATE POLICY "Allow public update access" ON public.users
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- 8. إنشاء Policy للحذف (Soft Delete)
CREATE POLICY "Allow public delete access" ON public.users
    FOR DELETE
    USING (true);

-- 9. تفعيل Real-time للجدول (مهم جداً!)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
    END IF;
END $$;

-- 10. إنشاء Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 11. إنشاء Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 12. إضافة المديرة الافتراضية (إذا الجدول فارغ)
INSERT INTO public.users (id, name, role, password, job_title, email)
SELECT 
    'default_manager',
    'المديرة',
    'MANAGER',
    '1234',
    'مديرة الاستوديو',
    'manager@villahaddad.local'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE role = 'MANAGER'
);

-- ✅ تم! الآن جدول المستخدمين جاهز للتزامن الفوري
-- ============================================
