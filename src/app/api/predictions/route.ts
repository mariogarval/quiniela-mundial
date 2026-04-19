import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { LOCK_DATE_ISO } from "@/lib/constants";

function locked() {
  return new Date(LOCK_DATE_ISO).getTime() <= Date.now();
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
    if (locked()) {
      return NextResponse.json({ error: "Las predicciones están cerradas" }, { status: 423 });
    }
    const { userId, predictions } = await req.json();
    if (!userId || !Array.isArray(predictions)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }
    const sb = getServerClient();

    // Ensure user exists + isn't already submitted
    const { data: user } = await sb.from("users").select("id, submitted_at").eq("id", userId).maybeSingle();
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (user.submitted_at) return NextResponse.json({ error: "Quiniela ya enviada" }, { status: 409 });

    const rows = predictions
      .filter((p: any) => p && p.match_id && Number.isFinite(p.predicted_home_score) && Number.isFinite(p.predicted_away_score))
      .map((p: any) => ({
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
