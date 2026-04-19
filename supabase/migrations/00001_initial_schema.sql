-- Quiniela Mundial — Initial schema
-- Run via: supabase db push  (or paste into Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ─── Pools ──────────────────────────────────────────────────────
create table if not exists pools (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  admin_id        uuid not null,
  admin_email     text not null,
  entry_fee_display text,
  plan            text not null default 'free' check (plan in ('free','business')),
  status          text not null default 'open' check (status in ('open','locked','group_done','completed')),
  payment_status  text not null default 'none' check (payment_status in ('none','knockout_paid','business_paid')),
  join_code       text not null unique,
  max_players     int not null default 15,
  slack_webhook   text,
  created_at      timestamptz not null default now()
);

create index if not exists pools_admin_id_idx on pools(admin_id);

-- ─── Users (players) ────────────────────────────────────────────
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  pool_id     uuid not null references pools(id) on delete cascade,
  is_admin    boolean not null default false,
  submitted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (pool_id, email)
);

create index if not exists users_pool_id_idx on users(pool_id);

-- ─── Matches (global, shared across pools) ──────────────────────
create table if not exists matches (
  id              uuid primary key default gen_random_uuid(),
  phase           text not null check (phase in ('group','r16','qf','sf','third','final')),
  group_name      text,
  matchday        int,
  slot            int,                -- bracket slot (0-based)
  home_team_code  text,               -- null for knockout until cascade resolved (per user)
  away_team_code  text,
  home_team_name  text,
  away_team_name  text,
  home_team_flag  text,
  away_team_flag  text,
  real_home_score int,
  real_away_score int,
  match_date      timestamptz not null,
  stadium         text,
  status          text not null default 'scheduled' check (status in ('scheduled','live','final'))
);

create index if not exists matches_phase_idx on matches(phase);
create index if not exists matches_group_idx on matches(group_name);

-- ─── Predictions ────────────────────────────────────────────────
-- For group: match_id references the real (shared) match.
-- For knockout: stored per-user as bracket_picks (because each user has their own bracket).
create table if not exists predictions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade,
  match_id             uuid not null references matches(id) on delete cascade,
  predicted_home_score int not null,
  predicted_away_score int not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (user_id, match_id)
);

-- ─── Bracket Picks (per-user knockout) ──────────────────────────
-- Each row = one knockout match in a user's personal bracket.
create table if not exists bracket_picks (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users(id) on delete cascade,
  phase                text not null check (phase in ('r16','qf','sf','third','final')),
  slot                 int not null,                  -- 0..(slots for phase - 1)
  home_team_code       text not null,
  away_team_code       text not null,
  home_team_name       text,
  away_team_name       text,
  home_team_flag       text,
  away_team_flag       text,
  predicted_home_score int not null,
  predicted_away_score int not null,
  winner_code          text not null,
  updated_at           timestamptz not null default now(),
  unique (user_id, phase, slot)
);

create index if not exists bracket_picks_user_idx on bracket_picks(user_id);

-- ─── Points ─────────────────────────────────────────────────────
create table if not exists points (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  pool_id         uuid not null references pools(id) on delete cascade,
  match_id        uuid references matches(id) on delete cascade,
  phase           text not null,
  slot            int,
  points_earned   int not null default 0,
  breakdown_json  jsonb not null default '{}'::jsonb,
  computed_at     timestamptz not null default now(),
  unique (user_id, phase, slot)
);

create index if not exists points_pool_user_idx on points(pool_id, user_id);

-- ─── Admin state (global results, bonuses) ──────────────────────
create table if not exists tournament_state (
  id                  int primary key default 1,
  group_stage_done    boolean not null default false,
  real_champion_code  text,
  updated_at          timestamptz not null default now(),
  check (id = 1)
);
insert into tournament_state (id) values (1) on conflict do nothing;

-- ─── Group stage matches seed ───────────────────────────────────
-- 8 groups × 6 matches = 48. Round-robin order: 1v2, 3v4, 1v3, 2v4, 1v4, 2v3.
do $$
declare
  g text;
  teams jsonb;
  team_codes text[];
  team_names text[];
  team_flags text[];
  rr int[][] := array[[1,2],[3,4],[1,3],[2,4],[1,4],[2,3]];
  md_dates timestamptz[] := array[
    '2026-06-13 12:00:00-06'::timestamptz,
    '2026-06-17 12:00:00-06'::timestamptz,
    '2026-06-21 12:00:00-06'::timestamptz
  ];
  stadium_list text[] := array[
    'SoFi Stadium, LA','MetLife Stadium, NY','AT&T Stadium, Dallas',
    'Levi''s Stadium, SF','Rose Bowl, LA','Hard Rock Stadium, Miami',
    'Mercedes-Benz Stadium, Atlanta','Lincoln Financial, Philly','Gillette Stadium, Boston',
    'NRG Stadium, Houston','Lumen Field, Seattle','Arrowhead, Kansas City',
    'BC Place, Vancouver','BMO Field, Toronto','Estadio Azteca, CDMX','Estadio BBVA, Monterrey'
  ];
  groups_data jsonb := '{
    "A":[["MEX","México","🇲🇽"],["RSA","Sudáfrica","🇿🇦"],["KOR","Corea del Sur","🇰🇷"],["CZE","Chequia","🇨🇿"]],
    "B":[["USA","Estados Unidos","🇺🇸"],["ECU","Ecuador","🇪🇨"],["SEN","Senegal","🇸🇳"],["AUS","Australia","🇦🇺"]],
    "C":[["CAN","Canadá","🇨🇦"],["POL","Polonia","🇵🇱"],["JPN","Japón","🇯🇵"],["CRC","Costa Rica","🇨🇷"]],
    "D":[["ARG","Argentina","🇦🇷"],["MAR","Marruecos","🇲🇦"],["SUI","Suiza","🇨🇭"],["NGA","Nigeria","🇳🇬"]],
    "E":[["FRA","Francia","🇫🇷"],["URU","Uruguay","🇺🇾"],["CRO","Croacia","🇭🇷"],["EGY","Egipto","🇪🇬"]],
    "F":[["BRA","Brasil","🇧🇷"],["GER","Alemania","🇩🇪"],["CMR","Camerún","🇨🇲"],["IRN","Irán","🇮🇷"]],
    "G":[["ESP","España","🇪🇸"],["COL","Colombia","🇨🇴"],["DEN","Dinamarca","🇩🇰"],["TUN","Túnez","🇹🇳"]],
    "H":[["ENG","Inglaterra","🏴"],["POR","Portugal","🇵🇹"],["NED","Países Bajos","🇳🇱"],["GHA","Ghana","🇬🇭"]]
  }'::jsonb;
  g_idx int := 0;
  m_idx int;
  md int;
  home_i int;
  away_i int;
begin
  -- Wipe existing group seed so re-runs are idempotent
  delete from matches where phase = 'group';

  for g in select jsonb_object_keys(groups_data) order by 1 loop
    teams := groups_data -> g;
    team_codes := array[
      (teams->0->>0), (teams->1->>0), (teams->2->>0), (teams->3->>0)
    ];
    team_names := array[
      (teams->0->>1), (teams->1->>1), (teams->2->>1), (teams->3->>1)
    ];
    team_flags := array[
      (teams->0->>2), (teams->1->>2), (teams->2->>2), (teams->3->>2)
    ];

    for m_idx in 1..6 loop
      md := case when m_idx <= 2 then 1 when m_idx <= 4 then 2 else 3 end;
      home_i := rr[m_idx][1];
      away_i := rr[m_idx][2];
      insert into matches (
        phase, group_name, matchday, slot,
        home_team_code, away_team_code, home_team_name, away_team_name,
        home_team_flag, away_team_flag, match_date, stadium
      ) values (
        'group', g, md, (g_idx * 6) + m_idx - 1,
        team_codes[home_i], team_codes[away_i],
        team_names[home_i], team_names[away_i],
        team_flags[home_i], team_flags[away_i],
        md_dates[md] + interval '3 hours' * ((m_idx - 1) % 2),
        stadium_list[1 + ((g_idx * 6 + m_idx - 1) % array_length(stadium_list, 1))]
      );
    end loop;
    g_idx := g_idx + 1;
  end loop;
end $$;

-- ─── Knockout shell rows (slots with dates; team assignment per user) ───
do $$
declare
  date_r16 timestamptz := '2026-06-28 12:00:00-06'::timestamptz;
  date_qf  timestamptz := '2026-07-04 12:00:00-06'::timestamptz;
  date_sf  timestamptz := '2026-07-10 12:00:00-06'::timestamptz;
  date_third timestamptz := '2026-07-15 12:00:00-06'::timestamptz;
  date_final timestamptz := '2026-07-19 12:00:00-06'::timestamptz;
begin
  delete from matches where phase in ('r16','qf','sf','third','final');
  for i in 0..7 loop
    insert into matches(phase, slot, match_date, stadium)
      values('r16', i, date_r16 + (interval '6 hours' * i), 'TBD');
  end loop;
  for i in 0..3 loop
    insert into matches(phase, slot, match_date, stadium)
      values('qf', i, date_qf + (interval '6 hours' * i), 'TBD');
  end loop;
  for i in 0..1 loop
    insert into matches(phase, slot, match_date, stadium)
      values('sf', i, date_sf + (interval '1 day' * i), 'TBD');
  end loop;
  insert into matches(phase, slot, match_date, stadium) values ('third', 0, date_third, 'TBD');
  insert into matches(phase, slot, match_date, stadium) values ('final', 0, date_final, 'Estadio Azteca, CDMX');
end $$;

-- ─── Row-Level Security ─────────────────────────────────────────
alter table pools enable row level security;
alter table users enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table bracket_picks enable row level security;
alter table points enable row level security;

-- Anyone can read pools + their own user rows (app uses service key for writes during MVP)
create policy pools_read on pools for select using (true);
create policy matches_read on matches for select using (true);
create policy users_read on users for select using (true);
create policy preds_read on predictions for select using (true);
create policy bracket_read on bracket_picks for select using (true);
create policy points_read on points for select using (true);
