import type { Team } from "./constants";
import type { StandingRow } from "@/types";

export type ScorePair = { home: string | number; away: string | number };
export type GroupMatchShape = {
  id: string;
  home_team_code: string | null;
  away_team_code: string | null;
  home_team_name?: string | null;
  away_team_name?: string | null;
  home_team_flag?: string | null;
  away_team_flag?: string | null;
};

/**
 * Compute group standings using FIFA 2026 tiebreakers:
 * 1) Points
 * 2) Goal difference
 * 3) Goals for
 * 4) Head-to-head result between tied teams
 * 5) Head-to-head GD between tied teams
 * 6) Head-to-head GF between tied teams
 * 7) Team code (stable)
 */
export function computeStandings(
  teams: Team[],
  matches: GroupMatchShape[],
  scores: Record<string, ScorePair>
): StandingRow[] {
  const byCode = new Map<string, StandingRow>();
  teams.forEach((t, i) =>
    byCode.set(t.code, {
      code: t.code, name: t.name, flag: t.flag, idx: i,
      pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0, gd: 0,
    })
  );

  const resolved: { h: string; a: string; hs: number; as: number }[] = [];

  for (const m of matches) {
    const sc = scores[m.id];
    if (!sc || sc.home === "" || sc.away === "" || m.home_team_code == null || m.away_team_code == null) continue;
    const hs = Number(sc.home);
    const as = Number(sc.away);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
    const hr = byCode.get(m.home_team_code);
    const ar = byCode.get(m.away_team_code);
    if (!hr || !ar) continue;
    hr.pj++; ar.pj++;
    hr.gf += hs; hr.gc += as;
    ar.gf += as; ar.gc += hs;
    if (hs > as) { hr.g++; ar.p++; hr.pts += 3; }
    else if (hs < as) { ar.g++; hr.p++; ar.pts += 3; }
    else { hr.e++; ar.e++; hr.pts += 1; ar.pts += 1; }
    resolved.push({ h: m.home_team_code, a: m.away_team_code, hs, as });
  }

  for (const row of byCode.values()) row.gd = row.gf - row.gc;

  const all = Array.from(byCode.values());

  all.sort((x, y) => {
    if (y.pts !== x.pts) return y.pts - x.pts;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    // H2H mini-table
    const h2h = buildH2H([x.code, y.code], resolved);
    if (h2h[y.code].pts !== h2h[x.code].pts) return h2h[y.code].pts - h2h[x.code].pts;
    if (h2h[y.code].gd !== h2h[x.code].gd) return h2h[y.code].gd - h2h[x.code].gd;
    if (h2h[y.code].gf !== h2h[x.code].gf) return h2h[y.code].gf - h2h[x.code].gf;
    return x.code.localeCompare(y.code);
  });

  return all;
}

function buildH2H(codes: string[], played: { h: string; a: string; hs: number; as: number }[]) {
  const set = new Set(codes);
  const table: Record<string, { pts: number; gd: number; gf: number }> = {};
  for (const c of codes) table[c] = { pts: 0, gd: 0, gf: 0 };
  for (const m of played) {
    if (!set.has(m.h) || !set.has(m.a)) continue;
    table[m.h].gf += m.hs; table[m.h].gd += m.hs - m.as;
    table[m.a].gf += m.as; table[m.a].gd += m.as - m.hs;
    if (m.hs > m.as) table[m.h].pts += 3;
    else if (m.hs < m.as) table[m.a].pts += 3;
    else { table[m.h].pts += 1; table[m.a].pts += 1; }
  }
  return table;
}

/** Pick the 8 best third-place teams across groups (not used in 8-group V1, kept for future 12-group expansion). */
export function pickBestThirds(thirds: StandingRow[], n = 8): StandingRow[] {
  return [...thirds]
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.code.localeCompare(b.code))
    .slice(0, n);
}
