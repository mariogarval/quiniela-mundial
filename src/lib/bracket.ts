import type { StandingRow } from "@/types";
import { pickBestThirds } from "./standings";

export type QualifiedSlot = { code: string; name: string; flag: string; group: string; pos: 1 | 2 | 3 };

// Slots 0-7: Groups A-H, cross-seeded to avoid same-group R32 rematches
const R32_PAIRS_DIRECT: { home: [string, 1 | 2]; away: [string, 1 | 2] }[] = [
  { home: ["A", 1], away: ["B", 2] },
  { home: ["B", 1], away: ["A", 2] },
  { home: ["C", 1], away: ["D", 2] },
  { home: ["D", 1], away: ["C", 2] },
  { home: ["E", 1], away: ["F", 2] },
  { home: ["F", 1], away: ["E", 2] },
  { home: ["G", 1], away: ["H", 2] },
  { home: ["H", 1], away: ["G", 2] },
];

const IL_GROUPS = ["I", "J", "K", "L"] as const;

/**
 * Build the 16-slot R32 bracket from group standings.
 * Slots 0-7:  A-H direct cross-seeded qualifiers
 * Slots 8-11: I1/J1/K1/L1 vs best thirds T1-T4
 * Slots 12-15: I2/J2/K2/L2 vs best thirds T5-T8
 */
export function buildR32(groupStandings: Record<string, StandingRow[]>) {
  const qualified: Record<string, { "1": QualifiedSlot; "2": QualifiedSlot }> = {};
  const allThirdsRows: StandingRow[] = [];

  for (const [g, rows] of Object.entries(groupStandings)) {
    if (rows.length < 2) continue;
    qualified[g] = {
      "1": { code: rows[0].code, name: rows[0].name, flag: rows[0].flag, group: g, pos: 1 },
      "2": { code: rows[1].code, name: rows[1].name, flag: rows[1].flag, group: g, pos: 2 },
    };
    if (rows[2]) allThirdsRows.push(rows[2]);
  }

  const slots: { slot: number; home: QualifiedSlot | null; away: QualifiedSlot | null }[] = [];

  for (let i = 0; i < 8; i++) {
    const p = R32_PAIRS_DIRECT[i];
    slots.push({
      slot: i,
      home: qualified[p.home[0]]?.[String(p.home[1]) as "1" | "2"] ?? null,
      away: qualified[p.away[0]]?.[String(p.away[1]) as "1" | "2"] ?? null,
    });
  }

  const bestThirds = pickBestThirds(allThirdsRows, 8);
  const thirdsSlots: QualifiedSlot[] = bestThirds.map((r) => ({
    code: r.code, name: r.name, flag: r.flag, group: "", pos: 3 as const,
  }));

  for (let i = 0; i < 4; i++) {
    slots.push({
      slot: 8 + i,
      home: qualified[IL_GROUPS[i]]?.["1"] ?? null,
      away: thirdsSlots[i] ?? null,
    });
  }
  for (let i = 0; i < 4; i++) {
    slots.push({
      slot: 12 + i,
      home: qualified[IL_GROUPS[i]]?.["2"] ?? null,
      away: thirdsSlots[4 + i] ?? null,
    });
  }

  return slots;
}

export const NEXT_PHASE_PAIRS: Record<string, number[][]> = {
  r32: [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15]],
  r16: [[0, 1], [2, 3], [4, 5], [6, 7]],
  qf:  [[0, 1], [2, 3]],
  sf:  [[0, 1]],
};

export type BracketNodePick = {
  slot: number;
  homeCode: string; homeName: string; homeFlag: string;
  awayCode: string; awayName: string; awayFlag: string;
  winnerCode: string;
};

export function nextRound(picks: BracketNodePick[], phase: "r32" | "r16" | "qf" | "sf") {
  const pairs = NEXT_PHASE_PAIRS[phase];
  return pairs.map((p, i) => {
    const a = picks.find((x) => x.slot === p[0]);
    const b = picks.find((x) => x.slot === p[1]);
    if (!a || !b) return { slot: i, home: null, away: null };
    const aWin = a.winnerCode === a.homeCode
      ? { code: a.homeCode, name: a.homeName, flag: a.homeFlag }
      : { code: a.awayCode, name: a.awayName, flag: a.awayFlag };
    const bWin = b.winnerCode === b.homeCode
      ? { code: b.homeCode, name: b.homeName, flag: b.homeFlag }
      : { code: b.awayCode, name: b.awayName, flag: b.awayFlag };
    return { slot: i, home: aWin, away: bWin };
  });
}

export function thirdPlacePair(sfPicks: BracketNodePick[]) {
  if (sfPicks.length < 2) return null;
  const losers = sfPicks.map((p) =>
    p.winnerCode === p.homeCode
      ? { code: p.awayCode, name: p.awayName, flag: p.awayFlag }
      : { code: p.homeCode, name: p.homeName, flag: p.homeFlag }
  );
  return { slot: 0, home: losers[0], away: losers[1] };
}
