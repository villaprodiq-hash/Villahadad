-- ============================================================
-- Migration: Client Portal OTP resend cooldown support
-- Date: 2026-02-16
-- Description:
--   - Adds last OTP send timestamp to enforce resend cooldown
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS otp_last_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_otp_last_sent_at
  ON bookings(otp_last_sent_at);

