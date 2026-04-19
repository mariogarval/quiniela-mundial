import { getServerClient } from "./supabase";
import { scoreGroupMatch, scoreGroupBonuses, scoreKnockoutMatch, scoreChampionBonus } from "./scoring";
import { GROUPS, GROUP_LETTERS } from "./constants";
import { computeStandings } from "./standings";
import type { Match } from "@/types";

/**
 * Recompute all pool points from scratch. Idempotent.
 * Call after each real result entry; it's cheap (~ms per user per match).
 */
export async function recomputeAllPoints(poolId?: string) {
  const sb = getServerClient();

  const [{ data: pools }, { data: matches }, { data: users }, { data: tournament }] = await Promise.all([
    poolId
      ? sb.from("pools").select("id").eq("id", poolId)
      : sb.from("pools").select("id"),
    sb.from("matches").select("*"),
    poolId
      ? sb.from("users").select("*").eq("pool_id", poolId)
      : sb.from("users").select("*"),
    sb.from("tournament_state").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (!pools?.length || !matches?.length || !users?.length) return;

  const matchById = new Map<string, Match>((matches as Match[]).map((m) => [m.id, m]));
  const groupMatches = (matches as Match[]).filter((m) => m.phase === "group");

  // Real group standings per group
  const realScores: Record<string, { home: string; away: string }> = {};
  for (const m of groupMatches) {
    if (m.real_home_score != null && m.real_away_score != null) {
      realScores[m.id] = { home: String(m.real_home_score), away: String(m.real_away_score) };
    }
  }
  const realGroupStandings: Record<string, ReturnType<typeof computeStandings>> = {};
  for (const g of GROUP_LETTERS) {
    const gm = groupMatches.filter((m) => m.group_name === g);
    realGroupStandings[g] = computeStandings(
      GROUPS[g],
      gm.map((m) => ({ id: m.id, home_team_code: m.home_team_code, away_team_code: m.away_team_code })),
      realScores,
    );
  }

  // Knockout real results by phase
  const realKnockout: Record<string, Match[]> = {};
  for (const m of matches as Match[]) {
    if (m.phase === "group") continue;
    (realKnockout[m.phase] ||= []).push(m);
  }

  const realChampion = tournament?.real_champion_code ?? null;

  for (const pool of pools) {
    const poolUsers = users.filter((u) => u.pool_id === pool.id);
    if (poolUsers.length === 0) continue;

    const userIds = poolUsers.map((u) => u.id);
    const [{ data: allPreds }, { data: allBracket }] = await Promise.all([
      sb.from("predictions").select("*").in("user_id", userIds),
      sb.from("bracket_picks").select("*").in("user_id", userIds),
    ]);

    const pointsRows: {
      user_id: string; pool_id: string; match_id: string | null;
      phase: string; slot: number | null;
      points_earned: number; breakdown_json: Record<string, number>;
    }[] = [];

    // Delete existing pool points (idempotent rebuild)
    await sb.from("points").delete().eq("pool_id", pool.id);

    for (const user of poolUsers) {
      // ── Group exact/result points ──
      const userPreds = (allPreds ?? []).filter((p) => p.user_id === user.id);
      const predByMatch = new Map(userPreds.map((p) => [p.match_id, p]));

      for (const m of groupMatches) {
        if (m.real_home_score == null || m.real_away_score == null) continue;
        const pred = predByMatch.get(m.id);
        if (!pred) continue;
        const { points, breakdown } = scoreGroupMatch({
          predicted: { h: pred.predicted_home_score, a: pred.predicted_away_score },
          actual: { h: m.real_home_score, a: m.real_away_score },
        });
        pointsRows.push({
          user_id: user.id, pool_id: pool.id, match_id: m.id,
          phase: "group", slot: m.slot, points_earned: points, breakdown_json: breakdown,
        });
      }

      // ── Group bonuses (winner/runner-up/third per group) ──
      for (const g of GROUP_LETTERS) {
        const realStand = realGroupStandings[g];
        if (!realStand || realStand[0].pj === 0) continue; // group not fully played
        // User's predicted standings
        const userPredsForGroup: Record<string, { home: string; away: string }> = {};
        const gm = groupMatches.filter((mm) => mm.group_name === g);
        for (const mm of gm) {
          const up = predByMatch.get(mm.id);
          if (up) userPredsForGroup[mm.id] = { home: String(up.predicted_home_score), away: String(up.predicted_away_score) };
        }
        const predStand = computeStandings(
          GROUPS[g],
          gm.map((mm) => ({ id: mm.id, home_team_code: mm.home_team_code, away_team_code: mm.away_team_code })),
          userPredsForGroup,
        );
        if (predStand.length < 3) continue;
        const { points, breakdown } = scoreGroupBonuses(
          { winner: predStand[0].code, runnerUp: predStand[1].code, third: predStand[2].code },
          { winner: realStand[0].code, runnerUp: realStand[1].code, third: realStand[2].code },
        );
        if (points > 0) {
          pointsRows.push({
            user_id: user.id, pool_id: pool.id, match_id: null,
            phase: `group_bonus_${g}`, slot: null, points_earned: points, breakdown_json: breakdown,
          });
        }
      }

      // ── Knockout points ──
      const userBracket = (allBracket ?? []).filter((b) => b.user_id === user.id);
      const bracketByKey = new Map(userBracket.map((b) => [`${b.phase}-${b.slot}`, b]));

      for (const phase of ["r32", "r16", "qf", "sf", "third", "final"] as const) {
        const realMatches = (realKnockout[phase] ?? []).filter(
          (m) => m.real_home_score != null && m.real_away_score != null &&
                 m.home_team_code && m.away_team_code,
        );
        if (realMatches.length === 0) continue;

        const phaseRealWinners = new Set<string>();
        for (const rm of realMatches) {
          const rc = rm.real_home_score! > rm.real_away_score! ? rm.home_team_code :
                     rm.real_away_score! > rm.real_home_score! ? rm.away_team_code :
                     rm.home_team_code; // draws shouldn't exist in knockouts, fall back to home
          if (rc) phaseRealWinners.add(rc);
        }

        for (const rm of realMatches) {
          const pick = bracketByKey.get(`${phase}-${rm.slot}`);
          if (!pick) continue;
          const realWinner =
            rm.real_home_score! > rm.real_away_score! ? rm.home_team_code! :
            rm.real_away_score! > rm.real_home_score! ? rm.away_team_code! :
            rm.home_team_code!;
          const { points, breakdown } = scoreKnockoutMatch({
            predictedHomeCode: pick.home_team_code, predictedAwayCode: pick.away_team_code,
            predictedHomeScore: pick.predicted_home_score, predictedAwayScore: pick.predicted_away_score,
            predictedWinnerCode: pick.winner_code,
            realHomeCode: rm.home_team_code!, realAwayCode: rm.away_team_code!,
            realHomeScore: rm.real_home_score!, realAwayScore: rm.real_away_score!,
            realWinnerCode: realWinner,
            phaseRealWinners,
          });
          if (points > 0) {
            pointsRows.push({
              user_id: user.id, pool_id: pool.id, match_id: rm.id,
              phase, slot: rm.slot, points_earned: points, breakdown_json: breakdown,
            });
          }
        }
      }

      // ── Champion bonus ──
      if (realChampion) {
        const finalPick = userBracket.find((b) => b.phase === "final");
        if (finalPick) {
          const { points, breakdown } = scoreChampionBonus(finalPick.winner_code, realChampion);
          if (points > 0) {
            pointsRows.push({
              user_id: user.id, pool_id: pool.id, match_id: null,
              phase: "champion_bonus", slot: null, points_earned: points, breakdown_json: breakdown,
            });
          }
        }
      }
    }

    if (pointsRows.length > 0) {
      // Chunk-insert (Supabase payload limit ~1MB; usually fine well under)
      const chunks: typeof pointsRows[] = [];
      for (let i = 0; i < pointsRows.length; i += 500) chunks.push(pointsRows.slice(i, i + 500));
      for (const c of chunks) {
        const { error } = await sb.from("points").insert(c);
        if (error) console.error("points insert error", error);
      }
    }
  }
}
