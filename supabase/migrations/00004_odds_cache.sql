CREATE TABLE odds_cache (
  match_id      uuid PRIMARY KEY REFERENCES matches(id),
  home_win_prob float NOT NULL,
  draw_prob     float NOT NULL,
  away_win_prob float NOT NULL,
  source        text NOT NULL DEFAULT 'odds_api',
  fetched_at    timestamptz NOT NULL DEFAULT now()
);
