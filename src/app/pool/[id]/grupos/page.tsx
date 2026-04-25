import { notFound } from "next/navigation";
import { GruposClient } from "@/components/GruposClient";
import { loadGroupMatches, loadPoolWithPlayers } from "@/lib/data";
import { getServerClient } from "@/lib/supabase";

export default async function GruposPage({
  params, searchParams,
}: { params: { id: string }; searchParams: { u?: string } }) {
  const { pool } = await loadPoolWithPlayers(params.id);
  if (!pool) return notFound();
  const matches = await loadGroupMatches();

  let initialScores: Record<string, { home: string; away: string }> = {};
  if (searchParams.u) {
    const sb = getServerClient();
    const { data } = await sb
      .from("predictions")
      .select("match_id, predicted_home_score, predicted_away_score")
      .eq("user_id", searchParams.u);
    for (const p of data ?? []) {
      initialScores[p.match_id] = {
        home: String(p.predicted_home_score),
        away: String(p.predicted_away_score),
      };
    }
  }

  return (
    <main className="min-h-screen bg-bg">
      <GruposClient poolId={pool.id} matches={matches} initialScores={initialScores} />
    </main>
  );
}
