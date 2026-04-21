-- Per-user AI access per pool (after payment)
CREATE TABLE ai_purchases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id),
  pool_id    uuid NOT NULL REFERENCES pools(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, pool_id)
);

-- Track whether a user has consumed their one free AI trial in this pool
ALTER TABLE users ADD COLUMN ai_trial_used boolean NOT NULL DEFAULT false;
