import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { LOCK_DATE_ISO } from "@/lib/constants";

function locked() {
  return new Date(LOCK_DATE_ISO).getTime() <= Date.now();
}

export async function POST(req: Request) {
  try {
    if (locked()) return NextResponse.json({ error: "Las predicciones están cerradas" }, { status: 423 });
    const { userId, picks, submit } = await req.json();
    if (!userId || !Array.isArray(picks)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const sb = getServerClient();

    const { data: user } = await sb.from("users").select("id, submitted_at").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (user.submitted_at) return NextResponse.json({ error: "Quiniela ya enviada" }, { status: 409 });

    const rows = picks.map((p: any) => ({
      user_id: userId,
      phase: p.phase,
      slot: p.slot,
      home_team_code: p.home_team_code,
      away_team_code: p.away_team_code,
      home_team_name: p.home_team_name ?? null,
      away_team_name: p.away_team_name ?? null,
      home_team_flag: p.home_team_flag ?? null,
      away_team_flag: p.away_team_flag ?? null,
      predicted_home_score: Number(p.predicted_home_score),
      predicted_away_score: Number(p.predicted_away_score),
      winner_code: p.winner_code,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await sb.from("bracket_picks").upsert(rows, { onConflict: "user_id,phase,slot" });
    if (error) throw error;

    if (submit) {
      // Ensure all 48 group predictions + all 16 bracket picks exist
      const [{ count: predsCount }, { count: bracketCount }] = await Promise.all([
        sb.from("predictions").select("id", { count: "exact", head: true }).eq("user_id", userId),
        sb.from("bracket_picks").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      if ((predsCount ?? 0) < 72) return NextResponse.json({ error: "Fase de grupos incompleta" }, { status: 400 });
      if ((bracketCount ?? 0) < 32) return NextResponse.json({ error: "Llave incompleta" }, { status: 400 });
      await sb.from("users").update({ submitted_at: new Date().toISOString() }).eq("id", userId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
