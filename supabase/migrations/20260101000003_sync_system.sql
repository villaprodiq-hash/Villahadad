-- ============================================
-- Villa Hadad - Sync System Tables
-- جداول نظام المزامنة والتعارضات
-- ============================================

-- 1. جدول طابور المزامنة (Sync Queue)
CREATE TABLE IF NOT EXISTS public.sync_queue (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    entity TEXT NOT NULL, -- 'booking', 'user', etc.
    data JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON public.sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON public.sync_queue(entity);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON public.sync_queue(created_at);

-- 2. جدول التعارضات (Conflicts)
CREATE TABLE IF NOT EXISTS public.conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id TEXT NOT NULL,
    proposed_by_name TEXT NOT NULL,
    proposed_by_rank TEXT DEFAULT 'RECEPTION',
    proposed_data JSONB NOT NULL,
    remote_data JSONB, -- البيانات الحالية في السحابة
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'RESOLVED', 'REJECTED'
    resolution TEXT, -- 'local', 'remote', 'merged'
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_conflicts_booking_id ON public.conflicts(booking_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_status ON public.conflicts(status);
CREATE INDEX IF NOT EXISTS idx_conflicts_proposed_by ON public.conflicts(proposed_by_name);

-- 3. تفعيل Row Level Security
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;

-- 4. Policies للمزامنة (تسمح للـ Edge Function بالوصول الكامل)
-- Sync Queue Policies
CREATE POLICY "Allow service role full access on sync_queue" ON public.sync_queue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read on sync_queue" ON public.sync_queue
    FOR SELECT
    TO authenticated
    USING (true);

-- Conflicts Policies
CREATE POLICY "Allow service role full access on conflicts" ON public.conflicts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read on conflicts" ON public.conflicts
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated update on conflicts" ON public.conflicts
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. تفعيل Real-time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'conflicts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conflicts;
    END IF;
END $$;

-- 6. Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers لتحديث updated_at
DROP TRIGGER IF EXISTS update_sync_queue_updated_at ON public.sync_queue;
CREATE TRIGGER update_sync_queue_updated_at
    BEFORE UPDATE ON public.sync_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conflicts_updated_at ON public.conflicts;
CREATE TRIGGER update_conflicts_updated_at
    BEFORE UPDATE ON public.conflicts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Function لتنظيف الطابور القديم (أكثر من 7 أيام)
CREATE OR REPLACE FUNCTION cleanup_old_sync_queue()
RETURNS void AS $$
BEGIN
    DELETE FROM public.sync_queue
    WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ language 'plpgsql';

-- ✅ تم! جداول نظام المزامنة جاهزة
-- ============================================
