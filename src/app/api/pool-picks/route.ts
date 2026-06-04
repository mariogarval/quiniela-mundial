import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";

// GET /api/pool-picks?poolId=xxx
// Returns all users in the pool who completed their bracket with their champion/runner-up/3rd picks
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const poolId = searchParams.get("poolId");
  if (!poolId) return NextResponse.json({ error: "poolId required" }, { status: 400 });

  const sb = getServerClient();

  // Get all users in the pool
  const { data: users } = await sb
    .from("users")
    .select("id, name")
    .eq("pool_id", poolId);

  if (!users || users.length === 0) return NextResponse.json({ picks: [] });

  const userIds = users.map((u) => u.id);

  // Get final and third picks for all users in this pool
  const { data: bracketPicks } = await sb
    .from("bracket_picks")
    .select("user_id, phase, home_team_code, home_team_name, home_team_flag, away_team_code, away_team_name, away_team_flag, winner_code")
    .in("user_id", userIds)
    .in("phase", ["final", "third"]);

  if (!bracketPicks) return NextResponse.json({ picks: [] });

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  // Group by user
  const byUser = new Map<string, { final?: typeof bracketPicks[0]; third?: typeof bracketPicks[0] }>();
  for (const pick of bracketPicks) {
    if (!byUser.has(pick.user_id)) byUser.set(pick.user_id, {});
    const entry = byUser.get(pick.user_id)!;
    if (pick.phase === "final") entry.final = pick;
    if (pick.phase === "third") entry.third = pick;
  }

  const picks = [];
  for (const [userId, { final: finalPick, third: thirdPick }] of byUser) {
    if (!finalPick) continue; // skip users who haven't completed the bracket

    const champion = finalPick.winner_code === finalPick.home_team_code
      ? { code: finalPick.home_team_code, name: finalPick.home_team_name, flag: finalPick.home_team_flag }
      : { code: finalPick.away_team_code, name: finalPick.away_team_name, flag: finalPick.away_team_flag };

    const runnerUp = finalPick.winner_code === finalPick.home_team_code
      ? { code: finalPick.away_team_code, name: finalPick.away_team_name, flag: finalPick.away_team_flag }
      : { code: finalPick.home_team_code, name: finalPick.home_team_name, flag: finalPick.home_team_flag };

    const thirdPlace = thirdPick
      ? thirdPick.winner_code === thirdPick.home_team_code
        ? { code: thirdPick.home_team_code, name: thirdPick.home_team_name, flag: thirdPick.home_team_flag }
        : { code: thirdPick.away_team_code, name: thirdPick.away_team_name, flag: thirdPick.away_team_flag }
      : null;

    picks.push({
      userId,
      userName: userMap.get(userId) ?? "?",
      champion,
      runnerUp,
      thirdPlace,
    });
  }

  return NextResponse.json({ picks });
}
