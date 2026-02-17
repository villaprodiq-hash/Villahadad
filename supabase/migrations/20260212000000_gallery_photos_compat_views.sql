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
-- galleries read model
-- If a real table named "galleries" already exists, skip safely.
-- ------------------------------------------------------------------
DO $$
DECLARE
  galleries_relkind "char";
BEGIN
  SELECT c.relkind
  INTO galleries_relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'galleries'
  LIMIT 1;

  IF galleries_relkind IS NULL OR galleries_relkind = 'v' THEN
    EXECUTE $sql$
      CREATE OR REPLACE VIEW public.galleries AS
      SELECT
        COALESCE(
          to_jsonb(s)->>'id',
          to_jsonb(s)->>'session_id',
          to_jsonb(s)->>'sessionId',
          to_jsonb(s)->>'sessionid'
        ) AS id,
        COALESCE(
          to_jsonb(s)->>'client_name',
          to_jsonb(s)->>'clientName',
          ''
        ) AS client_name,
        COALESCE(
          to_jsonb(s)->>'id',
          to_jsonb(s)->>'session_id',
          to_jsonb(s)->>'sessionId',
          to_jsonb(s)->>'sessionid'
        ) AS session_id,
        COALESCE(
          to_jsonb(s)->>'booking_id',
          to_jsonb(s)->>'bookingId',
          to_jsonb(s)->>'bookingid'
        ) AS booking_id,
        COALESCE(to_jsonb(s)->>'status', 'pending') AS status,
        COALESCE(
          NULLIF(to_jsonb(s)->>'created_at', '')::timestamptz,
          NULLIF(to_jsonb(s)->>'createdAt', '')::timestamptz,
          NULLIF(to_jsonb(s)->>'createdat', '')::timestamptz,
          NOW()
        ) AS created_at,
        COALESCE(
          NULLIF(to_jsonb(s)->>'updated_at', '')::timestamptz,
          NULLIF(to_jsonb(s)->>'updatedAt', '')::timestamptz,
          NULLIF(to_jsonb(s)->>'updatedat', '')::timestamptz,
          NULLIF(to_jsonb(s)->>'created_at', '')::timestamptz,
          NULLIF(to_jsonb(s)->>'createdAt', '')::timestamptz,
          NOW()
        ) AS updated_at
      FROM public.sessions s
    $sql$;
  ELSE
    RAISE NOTICE 'Skipping view public.galleries because relation exists as relkind=%', galleries_relkind;
  END IF;
END $$;

-- ------------------------------------------------------------------
-- photos read model
-- If a real table named "photos" already exists, skip safely.
-- ------------------------------------------------------------------
DO $$
DECLARE
  photos_relkind "char";
BEGIN
  SELECT c.relkind
  INTO photos_relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'photos'
  LIMIT 1;

  IF photos_relkind IS NULL OR photos_relkind = 'v' THEN
    EXECUTE $sql$
      CREATE OR REPLACE VIEW public.photos AS
      SELECT
        COALESCE(to_jsonb(si)->>'id', '') AS id,
        COALESCE(
          to_jsonb(si)->>'session_id',
          to_jsonb(si)->>'sessionId',
          to_jsonb(si)->>'sessionid',
          to_jsonb(si)->>'booking_id',
          to_jsonb(si)->>'bookingId',
          to_jsonb(si)->>'bookingid',
          ''
        ) AS gallery_id,
        COALESCE(to_jsonb(si)->>'cloud_url', to_jsonb(si)->>'cloudUrl') AS cloud_url,
        COALESCE(to_jsonb(si)->>'file_name', to_jsonb(si)->>'fileName', '') AS file_name,
        COALESCE(
          NULLIF(to_jsonb(si)->>'uploaded_at', '')::timestamptz,
          NULLIF(to_jsonb(si)->>'uploadedAt', '')::timestamptz,
          NULLIF(to_jsonb(si)->>'created_at', '')::timestamptz,
          NULLIF(to_jsonb(si)->>'createdAt', '')::timestamptz,
          NOW()
        ) AS uploaded_at,
        COALESCE(to_jsonb(si)->>'thumbnail_url', to_jsonb(si)->>'thumbnailUrl') AS thumbnail_url,
        COALESCE(to_jsonb(si)->>'status', 'pending') AS status,
        CASE
          WHEN COALESCE(to_jsonb(si)->>'sort_order', to_jsonb(si)->>'sortOrder', '') ~ '^-?\\d+$'
            THEN COALESCE(to_jsonb(si)->>'sort_order', to_jsonb(si)->>'sortOrder')::integer
          ELSE 0
        END AS sort_order
      FROM public.session_images si
      WHERE COALESCE(to_jsonb(si)->>'cloud_url', to_jsonb(si)->>'cloudUrl', '') <> ''
    $sql$;
  ELSE
    RAISE NOTICE 'Skipping view public.photos because relation exists as relkind=%', photos_relkind;
  END IF;
END $$;

-- Grants for frontend reads with anon/authenticated keys
GRANT SELECT ON public.galleries TO anon, authenticated;
GRANT SELECT ON public.photos TO anon, authenticated;

COMMIT;
