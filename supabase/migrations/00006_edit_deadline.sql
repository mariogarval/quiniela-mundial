-- Add edit deadlines to tournament_state (24h before first match of each phase)
ALTER TABLE tournament_state
  ADD COLUMN IF NOT EXISTS group_edit_deadline  timestamptz,
  ADD COLUMN IF NOT EXISTS bracket_edit_deadline timestamptz;

-- Set from existing match data (idempotent)
UPDATE tournament_state SET
  group_edit_deadline  = (SELECT MIN(match_date) - interval '24 hours' FROM matches WHERE phase = 'group'),
  bracket_edit_deadline = (SELECT MIN(match_date) - interval '24 hours' FROM matches WHERE phase = 'r16')
WHERE id = 1;
