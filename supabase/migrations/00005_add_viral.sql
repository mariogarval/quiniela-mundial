-- Migration 00005: Add viral loop / referral / affiliate tracking columns
-- Payment columns (payment_status, knockout_unlocked) are KEPT in DB so the
-- PAYMENTS_ENABLED flag can be flipped without a schema change.

-- Viral loop: referral tracking on users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referred_by  uuid REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_count   integer NOT NULL DEFAULT 0;

-- UTM / affiliate attribution on users (set at join time)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

-- Affiliate click log (landing page fires a row per UTM visit)
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  ref_user_id  uuid        REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  converted    boolean     NOT NULL DEFAULT false
);

-- Helper RPC used by PUT /api/pool to bump referrer count atomically
CREATE OR REPLACE FUNCTION increment_referral_count(ref_user_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE users
  SET referral_count = referral_count + 1
  WHERE id = ref_user_id;
$$;
