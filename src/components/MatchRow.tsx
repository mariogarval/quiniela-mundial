"use client";

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
    // back to unanswered when decrementing past 0
    onChange(num === 0 ? "" : String(num - 1));
  };

  return (
    <div
      className={[
        "w-12 rounded-xl overflow-hidden flex flex-col select-none",
        filled
          ? "border border-brand-green/50 bg-brand-greenDim"
          : "border border-border bg-surface2",
      ].join(" ")}
    >
      <button
        onClick={increment}
        disabled={locked}
        className="h-8 flex items-center justify-center text-textMuted hover:text-white active:bg-white/10 transition-colors text-xl font-light disabled:opacity-25"
        aria-label="Aumentar"
      >
        +
      </button>
      <div className="h-px bg-border/50" />
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
      <div className="h-px bg-border/50" />
      <button
        onClick={decrement}
        disabled={locked || !filled}
        className="h-8 flex items-center justify-center text-textMuted hover:text-white active:bg-white/10 transition-colors text-xl font-light disabled:opacity-25"
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
          leading ? "bg-brand-green text-black" : "bg-white/10 text-textMuted",
        ].join(" ")}
      >
        W
      </div>
      <span
        className={[
          "text-xs font-semibold tabular-nums",
          leading ? "text-white" : "text-textMuted",
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
  const filled = score.home !== "" && score.away !== "";
  const timeLabel = match.date ? formatMatchTime(match.date) : null;

  const hp = odds ? Math.round(odds.homeWinProb * 100) : null;
  const dp = odds ? Math.round(odds.drawProb * 100) : null;
  const ap = odds ? Math.round(odds.awayWinProb * 100) : null;
  const homeLeads = odds ? odds.homeWinProb >= odds.awayWinProb : false;

  return (
    <div
      className={[
        "mx-4 mb-3 rounded-2xl overflow-hidden border",
        filled
          ? "border-brand-green/30 bg-gradient-to-b from-[#0d1f14] to-[#0d1015]"
          : "border-border bg-gradient-to-b from-[#111520] to-[#0d0f14]",
      ].join(" ")}
    >
      {/* Match time */}
      {timeLabel && (
        <div className="px-4 pt-3 pb-0">
          <span className="text-[11px] text-textMuted font-medium tabular-nums">{timeLabel}</span>
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

      {/* Win probability section — shown once odds are loaded */}
      {odds && hp !== null && dp !== null && ap !== null ? (
        <div className="px-4 pb-3">
          {/* Three-colour probability bar */}
          <div className="flex rounded-full overflow-hidden h-1 mb-2.5 gap-px">
            <div style={{ width: `${hp}%` }} className="bg-brand-green" />
            <div style={{ width: `${dp}%` }} className="bg-amber" />
            <div style={{ width: `${ap}%` }} className="bg-white/20" />
          </div>
          <div className="flex items-center justify-between">
            <WBadge pct={hp} leading={homeLeads} />
            <span className="text-[10px] text-textMuted">Win probability</span>
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
