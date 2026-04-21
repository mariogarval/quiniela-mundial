import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { TEAM_ENGLISH_NAMES, eloProbs, suggestScore } from "@/lib/odds-mapping";

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

type MatchInput = { id: string; homeCode: string; awayCode: string };
type OddsResult = {
  matchId: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  suggestedHome: number;
  suggestedAway: number;
  source: "odds_api" | "elo";
};

// POST /api/ai-predict
// Body: { userId, poolId, matches: [{ id, homeCode, awayCode }] }
export async function POST(req: Request) {
  try {
    const { userId, poolId, matches } = await req.json();
    if (!userId || !poolId || !Array.isArray(matches) || matches.length === 0) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });
    }

    const sb = getServerClient();

    // Check access in parallel
    const [{ data: purchase }, { data: user }] = await Promise.all([
      sb.from("ai_purchases").select("id").eq("user_id", userId).eq("pool_id", poolId).maybeSingle(),
      sb.from("users").select("ai_trial_used").eq("id", userId).maybeSingle(),
    ]);

    if (!purchase) {
      if (!user || user.ai_trial_used) {
        return NextResponse.json({ requiresPayment: true }, { status: 402 });
      }
      await sb.from("users").update({ ai_trial_used: true }).eq("id", userId);
    }

    const odds = await fetchOdds(matches, sb);
    return NextResponse.json({ odds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

async function fetchOdds(
  matches: MatchInput[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any
): Promise<OddsResult[]> {
  const matchIds = matches.map((m) => m.id);

  // Check cache
  const { data: cached } = await sb
    .from("odds_cache")
    .select("match_id, home_win_prob, draw_prob, away_win_prob, source, fetched_at")
    .in("match_id", matchIds);

  const now = Date.now();
  const freshCache = new Map<string, OddsResult>();
  for (const row of cached ?? []) {
    if (now - new Date(row.fetched_at).getTime() < CACHE_TTL_MS) {
      const { home, away } = suggestScore(row.home_win_prob, row.away_win_prob);
      freshCache.set(row.match_id, {
        matchId: row.match_id,
        homeWinProb: row.home_win_prob,
        drawProb: row.draw_prob,
        awayWinProb: row.away_win_prob,
        suggestedHome: home,
        suggestedAway: away,
        source: row.source,
      });
    }
  }

  const staleMatches = matches.filter((m) => !freshCache.has(m.id));
  if (staleMatches.length === 0) {
    return matches.map((m) => freshCache.get(m.id)!);
  }

  // Fetch from Odds API if key available, else use ELO fallback
  const apiKey = process.env.ODDS_API_KEY;
  const liveOdds = apiKey
    ? await fetchFromOddsApi(staleMatches, apiKey)
    : buildEloOdds(staleMatches);

  // Upsert into cache
  if (liveOdds.length > 0) {
    await sb.from("odds_cache").upsert(
      liveOdds.map((o) => ({
        match_id: o.matchId,
        home_win_prob: o.homeWinProb,
        draw_prob: o.drawProb,
        away_win_prob: o.awayWinProb,
        source: o.source,
        fetched_at: new Date().toISOString(),
      })),
      { onConflict: "match_id" }
    );
  }

  for (const o of liveOdds) freshCache.set(o.matchId, o);
  return matches.map((m) => freshCache.get(m.id)!).filter(Boolean);
}

async function fetchFromOddsApi(
  matches: MatchInput[],
  apiKey: string
): Promise<OddsResult[]> {
  const url = `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return buildEloOdds(matches); // fall through to ELO if API fails

  const apiData: {
    home_team: string;
    away_team: string;
    bookmakers: { markets: { key: string; outcomes: { name: string; price: number }[] }[] }[];
  }[] = await res.json();

  // Build a lookup: "HomeTeam|AwayTeam" → averaged probabilities
  const apiLookup = new Map<string, { home: number; draw: number; away: number }>();
  for (const event of apiData) {
    const h2hMarkets = event.bookmakers
      .flatMap((b) => b.markets)
      .filter((m) => m.key === "h2h");
    if (h2hMarkets.length === 0) continue;

    // Average decimal odds across bookmakers, then convert to prob
    const avgPrice = (name: string) => {
      const prices = h2hMarkets.flatMap((m) =>
        m.outcomes.filter((o) => o.name === name).map((o) => o.price)
      );
      return prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    };

    const rawHome = avgPrice(event.home_team);
    const rawDraw = avgPrice("Draw");
    const rawAway = avgPrice(event.away_team);
    if (!rawHome || !rawDraw || !rawAway) continue;

    // Implied probability: 1/odds, then normalize to remove vig
    const pH = 1 / rawHome, pD = 1 / rawDraw, pA = 1 / rawAway;
    const total = pH + pD + pA;
    apiLookup.set(`${event.home_team}|${event.away_team}`, {
      home: pH / total,
      draw: pD / total,
      away: pA / total,
    });
  }

  return matches.map((m): OddsResult => {
    const homeEn = TEAM_ENGLISH_NAMES[m.homeCode] ?? m.homeCode;
    const awayEn = TEAM_ENGLISH_NAMES[m.awayCode] ?? m.awayCode;
    const probs = apiLookup.get(`${homeEn}|${awayEn}`);

    if (probs) {
      const { home, away } = suggestScore(probs.home, probs.away);
      return {
        matchId: m.id,
        homeWinProb: probs.home,
        drawProb: probs.draw,
        awayWinProb: probs.away,
        suggestedHome: home,
        suggestedAway: away,
        source: "odds_api",
      };
    }
    // Match not found in API yet → fall back to ELO for this one
    return buildEloOdds([m])[0];
  });
}

function buildEloOdds(matches: MatchInput[]): OddsResult[] {
  return matches.map((m) => {
    const probs = eloProbs(m.homeCode, m.awayCode);
    const { home, away } = suggestScore(probs.home, probs.away);
    return {
      matchId: m.id,
      homeWinProb: probs.home,
      drawProb: probs.draw,
      awayWinProb: probs.away,
      suggestedHome: home,
      suggestedAway: away,
      source: "elo",
    };
  });
}
