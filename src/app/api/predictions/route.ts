import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

async function getGroupEditDeadline(sb: ReturnType<typeof getServerClient>): Promise<Date | null> {
  try {
    const { data, error } = await sb.from("tournament_state").select("group_edit_deadline").eq("id", 1).maybeSingle();
    if (error || !data?.group_edit_deadline) return null;
    return new Date(data.group_edit_deadline);
  } catch {
    return null; // column may not exist yet (migration pending)
  }
}

// GET /api/predictions?userId=...
export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  const sb = getServerClient();
  const [{ data: preds }, { data: bracket }] = await Promise.all([
    sb.from("predictions").select("match_id, predicted_home_score, predicted_away_score").eq("user_id", userId),
    sb.from("bracket_picks").select("*").eq("user_id", userId),
  ]);
  return NextResponse.json({ predictions: preds ?? [], bracket: bracket ?? [] });
}

// POST /api/predictions — upsert group predictions
export async function POST(req: Request) {
  try {
    const { userId, predictions } = await req.json();
    if (!userId || !Array.isArray(predictions)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const sb = getServerClient();

    const deadline = await getGroupEditDeadline(sb);
    if (deadline && new Date() >= deadline) {
      return NextResponse.json({ error: "Predictions locked — edit window has closed" }, { status: 423 });
    }

    // Ensure user exists
    const { data: user } = await sb.from("users").select("id").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const rows = predictions
      .filter((p: { match_id?: unknown; predicted_home_score?: unknown; predicted_away_score?: unknown }) =>
        p && p.match_id && Number.isFinite(p.predicted_home_score) && Number.isFinite(p.predicted_away_score)
      )
      .map((p: { match_id: string; predicted_home_score: number; predicted_away_score: number }) => ({
        user_id: userId,
        match_id: p.match_id,
        predicted_home_score: p.predicted_home_score,
        predicted_away_score: p.predicted_away_score,
        updated_at: new Date().toISOString(),
      }));

    if (rows.length === 0) return NextResponse.json({ ok: true, upserted: 0 });

    const { error } = await sb.from("predictions").upsert(rows, { onConflict: "user_id,match_id" });
    if (error) throw error;
    return NextResponse.json({ ok: true, upserted: rows.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
