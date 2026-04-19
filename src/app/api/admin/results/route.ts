import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerClient } from "@/lib/supabase";
import { recomputeAllPoints } from "@/lib/scoring-engine";

export async function POST(req: Request) {
  if (cookies().get("qm_admin")?.value !== "1") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { matchId, realHomeScore, realAwayScore, homeTeamCode, awayTeamCode } = await req.json();
    if (!matchId) return NextResponse.json({ error: "matchId requerido" }, { status: 400 });
    const sb = getServerClient();

    const update: Record<string, unknown> = {
      real_home_score: realHomeScore,
      real_away_score: realAwayScore,
      status: realHomeScore != null && realAwayScore != null ? "final" : "scheduled",
    };
    if (homeTeamCode) update.home_team_code = homeTeamCode;
    if (awayTeamCode) update.away_team_code = awayTeamCode;

    const { error } = await sb.from("matches").update(update).eq("id", matchId);
    if (error) throw error;

    // If this is the final match and has a winner, update tournament_state
    const { data: m } = await sb.from("matches").select("*").eq("id", matchId).maybeSingle();
    if (m?.phase === "final" && realHomeScore != null && realAwayScore != null) {
      const champ = realHomeScore > realAwayScore ? m.home_team_code : m.away_team_code;
      if (champ) await sb.from("tournament_state").update({ real_champion_code: champ, updated_at: new Date().toISOString() }).eq("id", 1);
    }

    // Fire-and-forget recompute; also await so admin sees "done"
    await recomputeAllPoints();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
