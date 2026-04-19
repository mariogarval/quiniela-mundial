"use client";
import { Card, Flag } from "./primitives";
import { computeStandings, type GroupMatchShape, type ScorePair } from "@/lib/standings";
import type { Team } from "@/lib/constants";

export function StandingsTable({
  teams, matches, scores,
}: {
  teams: Team[];
  matches: GroupMatchShape[];
  scores: Record<string, ScorePair>;
}) {
  const rows = computeStandings(teams, matches, scores);
  const cols = ["G", "E", "P", "GD", "Pts"];

  return (
    <div className="mx-4 mb-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
        <span className="text-[11px] text-textMuted uppercase tracking-widest">Tabla en tiempo real</span>
      </div>
      <Card>
        <div className="flex items-center px-3 py-2 border-b border-border">
          <span className="w-6 text-[10px] text-textSub font-semibold">Pos</span>
          <span className="flex-1 text-[10px] text-textSub font-semibold">Equipo</span>
          {cols.map((c) => (
            <span key={c} className="w-7 text-center text-[10px] text-textSub font-semibold">{c}</span>
          ))}
        </div>
        {rows.map((row, i) => {
          const bg = i < 2 ? "bg-[rgba(0,230,118,0.06)]" : i === 2 ? "bg-[rgba(255,183,77,0.05)]" : "";
          const posColor = i < 2 ? "text-brand-green" : i === 2 ? "text-amber" : "text-textMuted";
          return (
            <div
              key={row.code}
              className={["flex items-center px-3 py-2.5", bg, i < rows.length - 1 ? "border-b border-border" : ""].join(" ")}
            >
              <span className={["w-6 font-display text-base font-bold", posColor].join(" ")}>{i + 1}</span>
              <div className="flex-1 flex items-center gap-1.5">
                <Flag emoji={row.flag} size={16} />
                <span className="text-xs font-semibold">{row.code}</span>
                {i < 2 && <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />}
                {i === 2 && <span className="w-1.5 h-1.5 rounded-full bg-amber" />}
              </div>
              {[row.g, row.e, row.p, row.gd >= 0 ? `+${row.gd}` : row.gd, row.pts].map((v, j) => (
                <span
                  key={j}
                  className={[
                    "w-7 text-center",
                    j === 4 ? "font-display text-base font-bold" : "text-xs text-textMuted",
                  ].join(" ")}
                >
                  {v}
                </span>
              ))}
            </div>
          );
        })}
        <div className="px-3 py-2 flex gap-4">
          <Legend color="bg-brand-green" label="Clasifica" />
          <Legend color="bg-amber" label="3º — repesca" />
        </div>
      </Card>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={["w-2 h-2 rounded-full", color].join(" ")} />
      <span className="text-[10px] text-textMuted">{label}</span>
    </div>
  );
}
