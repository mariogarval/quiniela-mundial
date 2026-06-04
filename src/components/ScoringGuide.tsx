"use client";
import { useState } from "react";

const ROWS: { label: string; pts: number; color: "green" | "amber" | "blue" | "gold" }[] = [
  { label: "Marcador exacto (fase de grupos)", pts: 5, color: "green" },
  { label: "Resultado correcto (fase de grupos)", pts: 3, color: "green" },
  { label: "Ganador + marcador exacto (eliminatoria)", pts: 8, color: "amber" },
  { label: "Solo ganador correcto (eliminatoria)", pts: 5, color: "amber" },
  { label: "Wildcard — equipo avanzó en otra llave", pts: 2, color: "amber" },
  { label: "1er lugar del grupo (bonus)", pts: 5, color: "blue" },
  { label: "2do lugar del grupo (bonus)", pts: 3, color: "blue" },
  { label: "3er lugar del grupo (bonus)", pts: 2, color: "blue" },
  { label: "Campeón del torneo (bonus máximo)", pts: 15, color: "gold" },
];

const BADGE: Record<string, string> = {
  green: "bg-brand-greenDim text-brand-green",
  amber: "bg-[rgba(255,193,7,0.1)] text-amber",
  blue: "bg-[rgba(100,160,255,0.1)] text-[#64A0FF]",
  gold: "bg-[rgba(255,215,0,0.1)] text-gold",
};

export function ScoringGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <span>¿Cómo se calculan los puntos?</span>
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          className={["transition-transform duration-200", open ? "rotate-180" : ""].join(" ")}
        >
          <path d="M6 9l6 6 6-6" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-surface px-4 py-4 space-y-2">
          {ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <span className="text-xs text-textMuted">{r.label}</span>
              <span className={["shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg", BADGE[r.color]].join(" ")}>
                +{r.pts} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
