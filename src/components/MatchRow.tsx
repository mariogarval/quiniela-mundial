"use client";
import { Flag, ScoreInput } from "./primitives";

export type MatchRowData = {
  id: string;
  homeName: string;
  awayName: string;
  homeFlag: string;
  awayFlag: string;
  date?: string | null;
  stadium?: string | null;
};

export function MatchRow({
  match, score, onScore, locked,
}: {
  match: MatchRowData;
  score: { home: string; away: string };
  onScore: (side: "home" | "away", value: string) => void;
  locked?: boolean;
}) {
  const filled = score.home !== "" && score.away !== "";
  const dateLabel = match.date ? formatMatchDate(match.date) : null;
  return (
    <div
      className={[
        "px-4 py-3.5 border-b border-border",
        filled ? "bg-[rgba(0,230,118,0.04)]" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 justify-end">
          <span className="text-sm font-semibold text-right">{match.homeName}</span>
          <Flag emoji={match.homeFlag} size={24} />
        </div>
        <div className="flex items-center gap-1.5">
          <ScoreInput value={score.home} onChange={(v) => onScore("home", v)} locked={locked} />
          <span className="font-display text-xl text-textSub font-semibold">—</span>
          <ScoreInput value={score.away} onChange={(v) => onScore("away", v)} locked={locked} />
        </div>
        <div className="flex-1 flex items-center gap-2">
          <Flag emoji={match.awayFlag} size={24} />
          <span className="text-sm font-semibold">{match.awayName}</span>
        </div>
      </div>
      {(dateLabel || match.stadium) && (
        <div className="flex justify-center items-center gap-3 mt-2">
          {filled && <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />}
          <span className="text-[11px] text-textMuted">
            {[dateLabel, match.stadium].filter(Boolean).join(" · ")}
          </span>
        </div>
      )}
    </div>
  );
}

function formatMatchDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-GT", { day: "numeric", month: "short", timeZone: "America/Guatemala" });
}
