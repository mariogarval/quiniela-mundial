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
    <div className="relative">
      {/* Compact ? button */}
      <button
        onClick={() => setOpen((s) => !s)}
        title="¿Cómo se calculan los puntos?"
        className={[
          "w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold transition-colors shrink-0",
          open
            ? "bg-brand-greenDim border-brand-green text-brand-green"
            : "bg-surface border-border text-textMuted hover:border-brand-green/60 hover:text-brand-green",
        ].join(" ")}
      >
        ?
      </button>

      {/* Dropdown panel — anchored to the right */}
      {open && (
        <>
          {/* Backdrop to close */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-20 w-72 rounded-2xl border border-border bg-surface shadow-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-textMuted uppercase tracking-widest mb-1">
              📋 Puntos por acierto
            </p>
            {ROWS.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3">
                <span className="text-xs text-textMuted leading-snug">{r.label}</span>
                <span className={["shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg", BADGE[r.color]].join(" ")}>
                  +{r.pts} pts
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
