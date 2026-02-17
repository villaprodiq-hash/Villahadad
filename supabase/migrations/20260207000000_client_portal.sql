-- ============================================================
-- Migration: Client Portal + R2 Integration
-- Date: 2026-02-07
-- Description: Adds client_token to bookings for portal access,
--              session_images table for R2 photo tracking,
--              and sessions table for lifecycle management.
-- ============================================================

-- 1. Add client_token to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_token TEXT UNIQUE;

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_bookings_client_token ON bookings(client_token);

-- 2. Session Images table (tracks photos uploaded to R2)
CREATE TABLE IF NOT EXISTS session_images (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_path TEXT,
  cloud_url TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, selected, rejected, editing, final
  selected_by TEXT,                         -- client, selector, designer
  selected_at TIMESTAMPTZ,
  liked BOOLEAN DEFAULT FALSE,              -- Supabase: boolean; Local SQLite: integer 0/1
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  synced_to_cloud BOOLEAN DEFAULT FALSE      -- Supabase: boolean; Local SQLite: integer 0/1
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'session_images' AND column_name = 'session_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_session_images_session ON public.session_images(session_id);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'session_images' AND column_name = 'sessionid'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_session_images_sessionid ON public.session_images(sessionid);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'session_images' AND column_name = 'sessionId'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_session_images_session_camel ON public.session_images("sessionId");
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'session_images' AND column_name = 'booking_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_session_images_booking ON public.session_images(booking_id);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'session_images' AND column_name = 'bookingid'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_session_images_bookingid ON public.session_images(bookingid);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'session_images' AND column_name = 'bookingId'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_session_images_booking_camel ON public.session_images("bookingId");
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'session_images' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_session_images_status ON public.session_images(status);
  END IF;
END $$;

-- 3. Sessions table (tracks session lifecycle)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  nas_path TEXT,
  cloud_gallery_url TEXT,
  status TEXT NOT NULL DEFAULT 'ingesting',  -- ingesting, selecting, editing, printing, completed
  total_images INTEGER DEFAULT 0,
  selected_images INTEGER DEFAULT 0,
  upload_progress INTEGER DEFAULT 0,
  selection_method TEXT DEFAULT 'studio',     -- studio, remote, hybrid
  selection_confirmed_at TIMESTAMPTZ,        -- when client confirmed selection
  r2_cleanup_after TIMESTAMPTZ,              -- 45 days after confirmation → auto-delete from R2
  r2_cleaned BOOLEAN DEFAULT FALSE,          -- Supabase: boolean; Local SQLite: integer 0/1
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'booking_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sessions_booking ON public.sessions(booking_id);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'bookingid'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sessions_bookingid ON public.sessions(bookingid);
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'bookingId'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sessions_booking_camel ON public.sessions("bookingId");
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
  END IF;
END $$;

-- 4. RLS Policies for session_images
ALTER TABLE session_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_images_select" ON session_images;
DROP POLICY IF EXISTS "session_images_insert" ON session_images;
DROP POLICY IF EXISTS "session_images_update" ON session_images;

-- Allow read for authenticated users
CREATE POLICY "session_images_select" ON session_images
  FOR SELECT TO authenticated USING (true);

-- Allow insert/update for authenticated users
CREATE POLICY "session_images_insert" ON session_images
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "session_images_update" ON session_images
  FOR UPDATE TO authenticated USING (true);

-- 5. RLS Policies for sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select" ON sessions;
DROP POLICY IF EXISTS "sessions_insert" ON sessions;
DROP POLICY IF EXISTS "sessions_update" ON sessions;

CREATE POLICY "sessions_select" ON sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sessions_insert" ON sessions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sessions_update" ON sessions
  FOR UPDATE TO authenticated USING (true);
