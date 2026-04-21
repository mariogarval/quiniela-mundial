import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerClient } from "@/lib/supabase";

// Module-level singleton — reused across requests
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// GET /api/ai-predict?userId=&poolId=
// Returns access status so the UI can badge the button before the user clicks
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const poolId = searchParams.get("poolId");

  if (!userId || !poolId) {
    return NextResponse.json({ hasAccess: false, trialUsed: false });
  }

  const sb = getServerClient();
  const [{ data: purchase }, { data: user }] = await Promise.all([
    sb.from("ai_purchases").select("id").eq("user_id", userId).eq("pool_id", poolId).maybeSingle(),
    sb.from("users").select("ai_trial_used").eq("id", userId).maybeSingle(),
  ]);

  return NextResponse.json({
    hasAccess: !!purchase,
    trialUsed: user?.ai_trial_used ?? false,
  });
}

// POST /api/ai-predict
// Body: { userId, poolId, matches: [{ id, homeName, awayName }] }
export async function POST(req: Request) {
  try {
    const { userId, poolId, matches } = await req.json();
    if (!userId || !poolId || !Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const sb = getServerClient();

    // Check both access conditions in parallel
    const [{ data: purchase }, { data: user }] = await Promise.all([
      sb.from("ai_purchases").select("id").eq("user_id", userId).eq("pool_id", poolId).maybeSingle(),
      sb.from("users").select("ai_trial_used").eq("id", userId).maybeSingle(),
    ]);

    if (!purchase) {
      if (!user || user.ai_trial_used) {
        return NextResponse.json({ requiresPayment: true }, { status: 402 });
      }
      // Consume the free trial
      await sb.from("users").update({ ai_trial_used: true }).eq("id", userId);
    }

    const predictions = await generatePredictions(matches);
    return NextResponse.json({ predictions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type MatchInput = { id: string; homeName: string; awayName: string };
type AIPrediction = { matchId: string; homeScore: number; awayScore: number };

async function generatePredictions(matches: MatchInput[]): Promise<AIPrediction[]> {
  if (!anthropic) {
    // Dev fallback: random realistic scores
    return matches.map((m) => ({ matchId: m.id, homeScore: randomScore(), awayScore: randomScore() }));
  }

  const matchList = matches
    .map((m) => `- ID "${m.id}": ${m.homeName} vs ${m.awayName}`)
    .join("\n");

  const prompt = `You are a FIFA World Cup 2026 expert analyst. Predict realistic group-stage final scores.
Consider: team strength, World Cup historical averages (~2.5 goals/match), upsets happen ~20% of the time.

Return ONLY a JSON array, no other text:
[{"match_id":"<id>","home_score":<number>,"away_score":<number>}, ...]

Matches:
${matchList}`;

  const message = await anthropic.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "[]";
  const parsed: { match_id: string; home_score: number; away_score: number }[] = JSON.parse(raw);

  return parsed.map((p) => ({
    matchId: p.match_id,
    homeScore: Math.max(0, Math.round(p.home_score)),
    awayScore: Math.max(0, Math.round(p.away_score)),
  }));
}

// Weighted random: ~45% home win, ~25% draw, ~30% away win
function randomScore(): number {
  const r = Math.random();
  if (r < 0.5) return 1;
  if (r < 0.75) return 2;
  if (r < 0.87) return 0;
  return 3;
}
