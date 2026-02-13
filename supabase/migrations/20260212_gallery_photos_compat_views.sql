-- ============================================================
-- Migration: Gallery/Photos compatibility views for Next page
-- Date: 2026-02-12
-- Purpose:
--   Provide `galleries` and `photos` read models expected by:
--   src/app/gallery/[id]/page.tsx
-- Source tables:
--   sessions, session_images
-- ============================================================

BEGIN;

-- Safety: require source tables to exist
DO $$
BEGIN
  IF to_regclass('public.sessions') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.sessions';
  END IF;

  IF to_regclass('public.session_images') IS NULL THEN
    RAISE EXCEPTION 'Missing table public.session_images';
  END IF;
END $$;

-- ------------------------------------------------------------------
-- galleries view (expected columns: id, client_name, session_id)
-- ------------------------------------------------------------------
CREATE OR REPLACE VIEW public.galleries AS
SELECT
  s.id::text AS id,
  s.client_name,
  s.id::text AS session_id,
  s.booking_id::text AS booking_id,
  s.status,
  s.created_at,
  s.updated_at
FROM public.sessions s;

-- ------------------------------------------------------------------
-- photos view (expected columns used by page:
-- id, gallery_id, cloud_url, file_name, uploaded_at)
-- ------------------------------------------------------------------
CREATE OR REPLACE VIEW public.photos AS
SELECT
  si.id::text AS id,
  si.session_id::text AS gallery_id,
  si.cloud_url,
  si.file_name,
  COALESCE(si.uploaded_at, si.created_at) AS uploaded_at,
  si.thumbnail_url,
  si.status,
  si.sort_order
FROM public.session_images si
WHERE si.cloud_url IS NOT NULL
  AND si.cloud_url <> '';

-- Grants for frontend reads with anon/authenticated keys
GRANT SELECT ON public.galleries TO anon, authenticated;
GRANT SELECT ON public.photos TO anon, authenticated;

COMMIT;

