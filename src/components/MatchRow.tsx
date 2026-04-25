"use client";

// ── Team primary colours for the ambient card gradient ────────────────────────
const TEAM_COLORS: Record<string, string> = {
  // CONCACAF
  USA: "#002868", MEX: "#006847", CAN: "#FF0000",
  CRC: "#002B7F", HON: "#0073CF", PAN: "#DA121A",
  JAM: "#000000", GUA: "#4997D0", SLV: "#0F47AF",
  TRI: "#CE1126", CUB: "#002A8F",
  // South America
  BRA: "#009C3B", ARG: "#74ACDF", COL: "#FCD116",
  URU: "#5AAAFF", CHL: "#D52B1E", ECU: "#FFD100",
  PAR: "#D52B1E", PER: "#D91023", VEN: "#CF142B",
  BOL: "#D52B1E",
  // Europe
  FRA: "#002395", ENG: "#CF081F", GER: "#1A1A1A",
  ESP: "#AA151B", POR: "#006600", NED: "#FF4F00",
  BEL: "#EF3340", ITA: "#009246", CRO: "#FF0000",
  SUI: "#FF0000", DEN: "#C60C30", POL: "#DC143C",
  SRB: "#C6363C", UKR: "#005BBB", AUT: "#ED2939",
  TUR: "#E30A17", CZE: "#D7141A", HUN: "#CE2939",
  SCO: "#003F87", WAL: "#C8102E", SVK: "#0B4EA2",
  GRE: "#001489", NOR: "#EF2B2D", SWE: "#006AA7",
  ALB: "#E41E20", ISL: "#003897", FIN: "#003580",
  ROM: "#002B7F", BIH: "#002395", SVN: "#003DA5",
  GEO: "#FF0000", MKD: "#CE2028", MNE: "#D4AF37",
  // Africa
  SEN: "#00853F", NGA: "#008751", CMR: "#007A5E",
  MAR: "#C1272D", ZAF: "#007A4D", EGY: "#CE1126",
  GHA: "#006B3F", CIV: "#F77F00", TUN: "#E70013",
  ALG: "#006233", ETH: "#078930", MLI: "#14B53A",
  COD: "#007FFF", AGO: "#CC0000",
  // Asia
  JPN: "#BC002D", KOR: "#CD2E3A", IRN: "#239F40",
  SAU: "#006C35", AUS: "#00843D", QAT: "#8D1B3D",
  IRQ: "#007A3D", JOR: "#007A3D", OMA: "#DB161B",
  THA: "#A51931", VIE: "#DA251D", UZB: "#1EB53A",
  KAZ: "#00AFCA",
  // Oceania
  NZL: "#00247D",
};

const FALLBACK_COLOR = "#3a3d4d";

function teamColor(code?: string | null): string {
  if (!code) return FALLBACK_COLOR;
  return TEAM_COLORS[code.toUpperCase()] ?? FALLBACK_COLOR;
}

export type MatchOddsData = {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  source: "odds_api" | "elo";
};

export type MatchRowData = {
  id: string;
  homeName: string;
  awayName: string;
  homeFlag: string;
  awayFlag: string;
  homeCode?: string | null;
  awayCode?: string | null;
  date?: string | null;
  stadium?: string | null;
};

// ── Score stepper: + / value / − in one unified box ──────────────────────────
function ScoreStepper({
  value,
  onChange,
  locked,
}: {
  value: string;
  onChange: (v: string) => void;
  locked?: boolean;
}) {
  const num = value === "" ? null : Number(value);
  const filled = num !== null;

  const increment = () => {
    if (locked) return;
    onChange(String(num === null ? 0 : num + 1));
  };

  const decrement = () => {
    if (locked || num === null) return;
    onChange(num === 0 ? "" : String(num - 1));
  };

  return (
    <div
      className={[
        "w-12 rounded-xl overflow-hidden flex flex-col select-none",
        filled
          ? "border border-white/[0.18] bg-white/[0.07]"
          : "border border-white/10 bg-white/5",
      ].join(" ")}
    >
      <button
        onClick={increment}
        disabled={locked}
        className="h-8 flex items-center justify-center text-white/40 hover:text-white active:bg-white/10 transition-colors text-xl font-light disabled:opacity-25"
        aria-label="Aumentar"
      >
        +
      </button>
      <div className="h-px bg-white/10" />
      <div className="h-11 flex items-center justify-center">
        <span
          className={[
            "font-display text-2xl font-bold tabular-nums",
            filled ? "text-white" : "text-white/25",
          ].join(" ")}
        >
          {filled ? num : "?"}
        </span>
      </div>
      <div className="h-px bg-white/10" />
      <button
        onClick={decrement}
        disabled={locked || !filled}
        className="h-8 flex items-center justify-center text-white/40 hover:text-white active:bg-white/10 transition-colors text-xl font-light disabled:opacity-25"
        aria-label="Reducir"
      >
        −
      </button>
    </div>
  );
}

// ── Win-probability badge (the "W X%" pill) ───────────────────────────────────
function WBadge({ pct, leading }: { pct: number; leading: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={[
          "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
          leading ? "bg-white/25 text-white" : "bg-white/8 text-white/30",
        ].join(" ")}
      >
        W
      </div>
      <span
        className={[
          "text-xs font-semibold tabular-nums",
          leading ? "text-white" : "text-white/35",
        ].join(" ")}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MatchRow({
  match,
  score,
  onScore,
  locked,
  odds,
}: {
  match: MatchRowData;
  score: { home: string; away: string };
  onScore: (side: "home" | "away", value: string) => void;
  locked?: boolean;
  odds?: MatchOddsData | null;
}) {
  const timeLabel = match.date ? formatMatchTime(match.date) : null;

  const hp = odds ? Math.round(odds.homeWinProb * 100) : null;
  const dp = odds ? Math.round(odds.drawProb * 100) : null;
  const ap = odds ? Math.round(odds.awayWinProb * 100) : null;
  const homeLeads = odds ? odds.homeWinProb >= odds.awayWinProb : false;

  // Ambient gradient from each team's primary colour
  const hc = teamColor(match.homeCode);
  const ac = teamColor(match.awayCode);
  const ambientBg = `linear-gradient(to right, ${hc}12 0%, #0d0f14 40%, #0d0f14 60%, ${ac}12 100%)`;

  return (
    <div
      className="mx-4 mb-3 rounded-2xl overflow-hidden border border-white/[0.08]"
      style={{ background: ambientBg }}
    >
      {/* Match time */}
      {timeLabel && (
        <div className="px-4 pt-3 pb-0 flex items-center gap-2">
          <span className="text-[11px] text-white/35 font-medium tabular-nums">{timeLabel}</span>
          {locked && (
            <span className="text-[10px] text-white/20 font-medium tracking-wide">· Cerrado</span>
          )}
        </div>
      )}

      {/* Teams + steppers */}
      <div className="flex items-center px-4 py-4 gap-3">
        {/* Home team */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <span style={{ fontSize: 36, lineHeight: 1 }} aria-label={match.homeName}>
            {match.homeFlag}
          </span>
          <span className="text-xs font-semibold text-center leading-tight text-white line-clamp-2 w-full">
            {match.homeName}
          </span>
        </div>

        {/* Score steppers */}
        <div className="flex items-center gap-2 shrink-0">
          <ScoreStepper
            value={score.home}
            onChange={(v) => onScore("home", v)}
            locked={locked}
          />
          <ScoreStepper
            value={score.away}
            onChange={(v) => onScore("away", v)}
            locked={locked}
          />
        </div>

        {/* Away team */}
        <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <span style={{ fontSize: 36, lineHeight: 1 }} aria-label={match.awayName}>
            {match.awayFlag}
          </span>
          <span className="text-xs font-semibold text-center leading-tight text-white line-clamp-2 w-full">
            {match.awayName}
          </span>
        </div>
      </div>

      {/* Win probability section */}
      {odds && hp !== null && dp !== null && ap !== null ? (
        <div className="px-4 pb-3">
          <div className="flex rounded-full overflow-hidden h-1 mb-2.5 gap-px">
            <div style={{ width: `${hp}%` }} className="bg-white/50" />
            <div style={{ width: `${dp}%` }} className="bg-white/20" />
            <div style={{ width: `${ap}%` }} className="bg-white/10" />
          </div>
          <div className="flex items-center justify-between">
            <WBadge pct={hp} leading={homeLeads} />
            <span className="text-[10px] text-white/30">Win probability</span>
            <WBadge pct={ap} leading={!homeLeads} />
          </div>
        </div>
      ) : (
        <div className="h-2" />
      )}
    </div>
  );
}

function formatMatchTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Mexico_City",
    hour12: false,
  });
}
