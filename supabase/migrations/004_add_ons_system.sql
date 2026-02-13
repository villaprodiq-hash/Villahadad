-- ============================================
-- Villa Hadad - Add-Ons System Tables
-- جداول نظام الإضافات والمعاملات المالية
-- ============================================

-- 1. جدول الإضافات (Add-Ons)
CREATE TABLE IF NOT EXISTS public.add_ons (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'IQD',
    exchange_rate NUMERIC NOT NULL,
    converted_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
    requested_by TEXT NOT NULL,
    requested_by_name TEXT NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by TEXT,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    original_package_price NUMERIC NOT NULL,
    previous_total NUMERIC NOT NULL,
    new_total NUMERIC NOT NULL,
    customer_notified_at TIMESTAMPTZ,
    notification_method TEXT,
    invoice_id TEXT,
    invoiced_at TIMESTAMPTZ,
    payment_record_id TEXT,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_add_ons_booking_id ON public.add_ons(booking_id);
CREATE INDEX IF NOT EXISTS idx_add_ons_status ON public.add_ons(status);
CREATE INDEX IF NOT EXISTS idx_add_ons_requested_by ON public.add_ons(requested_by);

-- 2. جدول تدقيق الإضافات (Add-On Audit)
CREATE TABLE IF NOT EXISTS public.add_on_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    add_on_id TEXT NOT NULL,
    booking_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'created', 'updated', 'approved', 'rejected', 'paid'
    performed_by TEXT NOT NULL,
    performed_by_name TEXT NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),
    details TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_add_on_audit_add_on_id ON public.add_on_audit(add_on_id);
CREATE INDEX IF NOT EXISTS idx_add_on_audit_booking_id ON public.add_on_audit(booking_id);
CREATE INDEX IF NOT EXISTS idx_add_on_audit_performed_at ON public.add_on_audit(performed_at);

-- 3. جدول معاملات العملاء (Client Transactions)
CREATE TABLE IF NOT EXISTS public.client_transactions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    booking_id TEXT REFERENCES public.bookings(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'IQD',
    type TEXT NOT NULL, -- 'credit_addition', 'credit_deduction', 'refund', 'adjustment'
    note TEXT NOT NULL,
    status TEXT DEFAULT 'active', -- 'active', 'reversed', 'pending'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    can_reverse_until TIMESTAMPTZ NOT NULL, -- 5 minutes from creation
    reversed_at TIMESTAMPTZ,
    reversed_by TEXT,
    reversed_by_name TEXT,
    reversal_reason TEXT,
    balance_after NUMERIC NOT NULL
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_client_transactions_client_id ON public.client_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_client_transactions_booking_id ON public.client_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_transactions_status ON public.client_transactions(status);
CREATE INDEX IF NOT EXISTS idx_client_transactions_created_at ON public.client_transactions(created_at);

-- 4. تفعيل Row Level Security
ALTER TABLE public.add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_on_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Policies للإضافات
CREATE POLICY "Allow service role full access on add_ons" ON public.add_ons
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read on add_ons" ON public.add_ons
    FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Allow authenticated insert on add_ons" ON public.add_ons
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on add_ons" ON public.add_ons
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Policies للتدقيق
CREATE POLICY "Allow service role full access on add_on_audit" ON public.add_on_audit
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read on add_on_audit" ON public.add_on_audit
    FOR SELECT
    TO authenticated
    USING (true);

-- 7. Policies لمعاملات العملاء
CREATE POLICY "Allow service role full access on client_transactions" ON public.client_transactions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read on client_transactions" ON public.client_transactions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on client_transactions" ON public.client_transactions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on client_transactions" ON public.client_transactions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 8. تفعيل Real-time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'add_ons'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.add_ons;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'client_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.client_transactions;
    END IF;
END $$;

-- 9. Triggers لتحديث updated_at
DROP TRIGGER IF EXISTS update_add_ons_updated_at ON public.add_ons;
CREATE TRIGGER update_add_ons_updated_at
    BEFORE UPDATE ON public.add_ons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_transactions_updated_at ON public.client_transactions;
CREATE TRIGGER update_client_transactions_updated_at
    BEFORE UPDATE ON public.client_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ✅ تم! جداول نظام الإضافات جاهزة
-- ============================================
