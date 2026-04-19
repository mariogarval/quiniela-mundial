import { SCORING } from "./constants";
import type { Phase } from "@/types";

export type GroupScoringInput = {
  predicted: { h: number; a: number };
  actual: { h: number; a: number };
};

export function scoreGroupMatch({ predicted, actual }: GroupScoringInput): {
  points: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};
  let points = 0;
  if (predicted.h === actual.h && predicted.a === actual.a) {
    breakdown.exact = SCORING.group.exact;
    points += SCORING.group.exact;
  } else {
    const predWinner = predicted.h > predicted.a ? "H" : predicted.h < predicted.a ? "A" : "D";
    const realWinner = actual.h > actual.a ? "H" : actual.h < actual.a ? "A" : "D";
    if (predWinner === realWinner) {
      breakdown.result = SCORING.group.result;
      points += SCORING.group.result;
    }
  }
  return { points, breakdown };
}

export function scoreGroupBonuses(
  predictedTop: { winner: string; runnerUp: string; third: string },
  realTop: { winner: string; runnerUp: string; third: string }
) {
  const breakdown: Record<string, number> = {};
  let points = 0;
  if (predictedTop.winner === realTop.winner) {
    breakdown.winnerBonus = SCORING.group.winnerBonus;
    points += SCORING.group.winnerBonus;
  }
  if (predictedTop.runnerUp === realTop.runnerUp) {
    breakdown.runnerUpBonus = SCORING.group.runnerUpBonus;
    points += SCORING.group.runnerUpBonus;
  }
  if (predictedTop.third === realTop.third) {
    breakdown.thirdBonus = SCORING.group.thirdBonus;
    points += SCORING.group.thirdBonus;
  }
  return { points, breakdown };
}

/**
 * Knockout: Option A (strict + wildcard).
 *
 * predictedPick: user's bracket pick for a given slot (their predicted home/away and winner).
 * realMatch: the actual match teams and score at that slot (per user's bracket — their own teams may/may not match the real teams).
 * phaseAllRealWinners: set of real winner codes across the whole phase (used for wildcard detection).
 */
export function scoreKnockoutMatch(args: {
  predictedHomeCode: string; predictedAwayCode: string;
  predictedHomeScore: number; predictedAwayScore: number;
  predictedWinnerCode: string;
  realHomeCode: string; realAwayCode: string;
  realHomeScore: number; realAwayScore: number;
  realWinnerCode: string;
  phaseRealWinners: Set<string>;
}): { points: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let points = 0;

  // Slot match? Same two teams in this user's bracket slot.
  const slotPairMatches =
    (args.predictedHomeCode === args.realHomeCode && args.predictedAwayCode === args.realAwayCode) ||
    (args.predictedHomeCode === args.realAwayCode && args.predictedAwayCode === args.realHomeCode);

  if (slotPairMatches && args.predictedWinnerCode === args.realWinnerCode) {
    const sameOrientation =
      args.predictedHomeCode === args.realHomeCode &&
      args.predictedHomeScore === args.realHomeScore &&
      args.predictedAwayScore === args.realAwayScore;
    const flipOrientation =
      args.predictedHomeCode === args.realAwayCode &&
      args.predictedHomeScore === args.realAwayScore &&
      args.predictedAwayScore === args.realHomeScore;
    if (sameOrientation || flipOrientation) {
      breakdown.winnerExact = SCORING.knockout.winnerExact;
      points += SCORING.knockout.winnerExact;
    } else {
      breakdown.winnerOnly = SCORING.knockout.winnerOnly;
      points += SCORING.knockout.winnerOnly;
    }
  } else if (args.phaseRealWinners.has(args.predictedWinnerCode)) {
    // Wildcard: user predicted this team to win in their bracket, and the team actually
    // won somewhere in this real phase — just not in this user's slot.
    breakdown.wildcard = SCORING.knockout.wildcard;
    points += SCORING.knockout.wildcard;
  }

  return { points, breakdown };
}

export function scoreChampionBonus(predictedChampionCode: string, realChampionCode: string): { points: number; breakdown: Record<string, number> } {
  if (predictedChampionCode === realChampionCode) {
    return { points: SCORING.knockout.championBonus, breakdown: { championBonus: SCORING.knockout.championBonus } };
  }
  return { points: 0, breakdown: {} };
}

export function phaseDisplayName(p: Phase): string {
  return {
    group: "Fase de Grupos",
    r32: "Ronda de 32",
    r16: "Octavos de Final",
    qf: "Cuartos de Final",
    sf: "Semifinal",
    third: "Tercer Puesto",
    final: "Final",
  }[p];
}
