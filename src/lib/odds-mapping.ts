/** Maps 3-letter FIFA codes to English team names as used by The Odds API. */
export const TEAM_ENGLISH_NAMES: Record<string, string> = {
  // Group A
  MEX: "Mexico",
  RSA: "South Africa",
  KOR: "South Korea",
  CZE: "Czech Republic",
  // Group B
  CAN: "Canada",
  QAT: "Qatar",
  SUI: "Switzerland",
  BIH: "Bosnia and Herzegovina",
  // Group C
  BRA: "Brazil",
  MAR: "Morocco",
  SCO: "Scotland",
  HAI: "Haiti",
  // Group D
  USA: "United States",
  TUR: "Turkey",
  AUS: "Australia",
  PAR: "Paraguay",
  // Group E
  GER: "Germany",
  CUW: "Curacao",
  CIV: "Ivory Coast",
  ECU: "Ecuador",
  // Group F
  NED: "Netherlands",
  JPN: "Japan",
  SWE: "Sweden",
  TUN: "Tunisia",
  // Group G
  BEL: "Belgium",
  EGY: "Egypt",
  IRN: "Iran",
  NZL: "New Zealand",
  // Group H
  ESP: "Spain",
  URU: "Uruguay",
  KSA: "Saudi Arabia",
  CPV: "Cape Verde",
  // Group I
  FRA: "France",
  SEN: "Senegal",
  NOR: "Norway",
  IRQ: "Iraq",
  // Group J
  ARG: "Argentina",
  AUT: "Austria",
  ALG: "Algeria",
  JOR: "Jordan",
  // Group K
  POR: "Portugal",
  COL: "Colombia",
  COD: "DR Congo",
  UZB: "Uzbekistan",
  // Group L
  ENG: "England",
  CRO: "Croatia",
  GHA: "Ghana",
  PAN: "Panama",
};

/**
 * Approximate ELO-style strength ratings (50–90) for all 48 teams.
 * Used to compute fallback win probabilities when ODDS_API_KEY is not set.
 * Based on FIFA world rankings and recent tournament performance (2026).
 */
export const TEAM_ELO: Record<string, number> = {
  ARG: 90, FRA: 87, ENG: 85, BRA: 84, ESP: 83, GER: 82,
  POR: 81, BEL: 79, NED: 78, CRO: 77, URU: 76, COL: 75,
  SEN: 74, MAR: 73, JPN: 72, USA: 71, MEX: 70, NOR: 68,
  AUT: 67, SWE: 66, TUR: 65, KOR: 64, AUS: 63, SUI: 62,
  SCO: 62, GHA: 61, ECU: 61, CZE: 61, CAN: 60, EGY: 60,
  ALG: 60, CIV: 59, QAT: 58, PAR: 58, BIH: 57, IRN: 57,
  COD: 56, TUN: 56, KSA: 55, RSA: 55, CPV: 55, IRQ: 54,
  PAN: 54, UZB: 54, JOR: 52, NZL: 52, CUW: 51, HAI: 50,
};

/** Compute win/draw/away probabilities from ELO ratings. */
export function eloProbs(
  homeCode: string,
  awayCode: string
): { home: number; draw: number; away: number } {
  const homeElo = TEAM_ELO[homeCode] ?? 60;
  const awayElo = TEAM_ELO[awayCode] ?? 60;
  const diff = (homeElo - awayElo) / 20;
  const rawHome = 1 / (1 + Math.pow(10, -diff));
  const rawAway = 1 / (1 + Math.pow(10, diff));
  // World Cup group-stage draw rate ~22%; scale it toward that baseline
  const rawDraw = Math.max(0.08, 0.22 - Math.abs(diff) * 0.04);
  const total = rawHome + rawDraw + rawAway;
  return { home: rawHome / total, draw: rawDraw / total, away: rawAway / total };
}

/** Deterministically suggest a scoreline from win probabilities. */
export function suggestScore(
  homeProb: number,
  awayProb: number
): { home: number; away: number } {
  if (homeProb >= 0.65) return { home: 2, away: 0 };
  if (homeProb >= 0.50) return { home: 2, away: 1 };
  if (awayProb >= 0.65) return { home: 0, away: 2 };
  if (awayProb >= 0.50) return { home: 1, away: 2 };
  return { home: 1, away: 1 };
}
