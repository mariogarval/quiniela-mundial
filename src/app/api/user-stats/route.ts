import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

// GET /api/user-stats?userId=
// Returns lightweight stats for the challenge entry banner on the join page.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId requerido" }, { status: 400 });

  const sb = getServerClient();
  const [{ data: user }, { data: points }] = await Promise.all([
    sb.from("users").select("name, pool_id").eq("id", userId).maybeSingle(),
    sb.from("points").select("points_earned").eq("user_id", userId),
  ]);

  if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const totalPoints = (points ?? []).reduce((sum, r) => sum + (r.points_earned as number), 0);
  // Each correct group prediction = 3 pts; approximate correct count from total
  const total = (points ?? []).length;
  const correct = total > 0 ? Math.round(totalPoints / 3) : 0;

  return NextResponse.json({
    name: user.name,
    correctPredictions: correct,
    totalPredictions: total,
  });
}
