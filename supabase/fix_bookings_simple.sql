-- Simple fix for bookings RLS
-- Run this in Supabase SQL Editor

-- First check if table exists
DO $$
BEGIN
    -- Enable RLS on bookings table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bookings') THEN
        ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policy if any
        DROP POLICY IF EXISTS "Allow all on bookings" ON public.bookings;
        
        -- Create policy
        CREATE POLICY "Allow all on bookings"
        ON public.bookings
        FOR ALL
        TO PUBLIC
        USING (true)
        WITH CHECK (true);
        
        RAISE NOTICE 'Bookings table fixed';
    ELSE
        RAISE NOTICE 'Bookings table not found';
    END IF;
END $$;

-- Also fix users table if needed
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all on users" ON public.users;
        CREATE POLICY "Allow all on users"
        ON public.users FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
        RAISE NOTICE 'Users table fixed';
    END IF;
END $$;
