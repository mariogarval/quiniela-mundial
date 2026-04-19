import { getServerClient } from "./supabase";
import type { Match, Pool, User } from "@/types";

export async function loadPoolWithPlayers(poolId: string): Promise<{ pool: Pool | null; players: User[] }> {
  const sb = getServerClient();
  const [{ data: pool }, { data: players }] = await Promise.all([
    sb.from("pools").select("*").eq("id", poolId).maybeSingle(),
    sb.from("users").select("*").eq("pool_id", poolId).order("created_at", { ascending: true }),
  ]);
  return { pool: pool as Pool | null, players: (players ?? []) as User[] };
}

export async function loadGroupMatches(): Promise<Match[]> {
  const sb = getServerClient();
  const { data } = await sb
    .from("matches")
    .select("*")
    .eq("phase", "group")
    .order("group_name", { ascending: true })
    .order("matchday", { ascending: true })
    .order("slot", { ascending: true });
  return (data ?? []) as Match[];
}

export async function loadKnockoutShellMatches(): Promise<Match[]> {
  const sb = getServerClient();
  const { data } = await sb
    .from("matches")
    .select("*")
    .neq("phase", "group")
    .order("phase", { ascending: true })
    .order("slot", { ascending: true });
  return (data ?? []) as Match[];
}
