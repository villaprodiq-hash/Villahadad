-- ============================================================
-- Migration: Client Portal Security Hardening
-- Date: 2026-02-16
-- Description:
--   - Adds token expiry + OTP security columns to bookings
--   - Adds access_logs table for portal access auditing
--   - Secures access_logs with RLS + privilege revoke
-- ============================================================

-- 1) bookings: token + OTP fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_token_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp_blocked_until TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp_code_hash TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp_code_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;

-- Ensure predictable default for legacy rows.
ALTER TABLE bookings ALTER COLUMN otp_attempts SET DEFAULT 0;
UPDATE bookings SET otp_attempts = 0 WHERE otp_attempts IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_token_expires_at
  ON bookings(client_token_expires_at);
CREATE INDEX IF NOT EXISTS idx_bookings_otp_blocked_until
  ON bookings(otp_blocked_until);

-- 2) access_logs table for portal security telemetry
CREATE TABLE IF NOT EXISTS access_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  ip_address TEXT,
  action TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_booking_created_at
  ON access_logs(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_action_created_at
  ON access_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_success_created_at
  ON access_logs(success, created_at DESC);

-- 3) Restrict table to backend/service-role usage
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- No read/write policies are created intentionally.
-- Service role (used by Edge Functions) bypasses RLS.
REVOKE ALL ON TABLE access_logs FROM anon, authenticated;
