-- ============================================================
-- Migration: Client Portal Password Authentication
-- Date: 2026-02-16
-- Description:
--   - Replaces OTP login flow with password-based access
--   - Stores per-link password hash and login throttling state
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS client_portal_password_hash TEXT;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS client_portal_password_set_at TIMESTAMPTZ;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS client_portal_password_attempts INTEGER DEFAULT 0;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS client_portal_password_blocked_until TIMESTAMPTZ;

ALTER TABLE bookings
  ALTER COLUMN client_portal_password_attempts SET DEFAULT 0;

UPDATE bookings
SET client_portal_password_attempts = 0
WHERE client_portal_password_attempts IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_portal_password_set_at
  ON bookings(client_portal_password_set_at);

CREATE INDEX IF NOT EXISTS idx_bookings_client_portal_password_blocked_until
  ON bookings(client_portal_password_blocked_until);

