export type Phase = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final";

export type Match = {
  id: string;
  phase: Phase;
  group_name: string | null;
  matchday: number | null;
  slot: number | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_flag: string | null;
  away_team_flag: string | null;
  real_home_score: number | null;
  real_away_score: number | null;
  match_date: string;
  stadium: string | null;
  status: "scheduled" | "live" | "final";
};

export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
};

export type BracketPick = {
  id: string;
  user_id: string;
  phase: Exclude<Phase, "group">;
  slot: number;
  home_team_code: string;
  away_team_code: string;
  home_team_name: string | null;
  away_team_name: string | null;
  home_team_flag: string | null;
  away_team_flag: string | null;
  predicted_home_score: number;
  predicted_away_score: number;
  winner_code: string;
};

export type Pool = {
  id: string;
  name: string;
  admin_id: string;
  admin_email: string;
  entry_fee_display: string | null;
  plan: "free" | "business";
  status: "open" | "locked" | "group_done" | "completed";
  payment_status: "none" | "knockout_paid" | "business_paid";
  join_code: string;
  max_players: number;
  slack_webhook: string | null;
  created_at: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  pool_id: string;
  is_admin: boolean;
  submitted_at: string | null;
  created_at: string;
};

export type StandingRow = {
  code: string;
  name: string;
  flag: string;
  idx: number;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
  gd: number;
};
