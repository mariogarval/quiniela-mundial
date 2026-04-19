"use client";
import { useMemo, useState } from "react";
import { Card, Btn, Flag, ScoreInput } from "./primitives";
import type { Match } from "@/types";

export function AdminResults({ matches }: { matches: Match[] }) {
  const [tab, setTab] = useState<"group" | "r32" | "r16" | "qf" | "sf" | "third" | "final">("group");
  const [editing, setEditing] = useState<Record<string, { home: string; away: string; home_team_code?: string; away_team_code?: string }>>(() => {
    const init: any = {};
    for (const m of matches) {
      init[m.id] = {
        home: m.real_home_score != null ? String(m.real_home_score) : "",
        away: m.real_away_score != null ? String(m.real_away_score) : "",
        home_team_code: m.home_team_code ?? "",
        away_team_code: m.away_team_code ?? "",
      };
    }
    return init;
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const out: Record<string, Match[]> = { group: [], r32: [], r16: [], qf: [], sf: [], third: [], final: [] };
    for (const m of matches) (out[m.phase] ||= []).push(m);
    return out;
  }, [matches]);

  const save = async (match: Match) => {
    const st = editing[match.id];
    setBusy(match.id); setMsg(null);
    try {
      const res = await fetch("/api/admin/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          realHomeScore: st.home === "" ? null : Number(st.home),
          realAwayScore: st.away === "" ? null : Number(st.away),
          homeTeamCode: st.home_team_code || null,
          awayTeamCode: st.away_team_code || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "save failed");
      setMsg("Guardado + puntos recalculados");
      setTimeout(() => setMsg(null), 2000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally { setBusy(null); }
  };

  const tabs = [
    { id: "group", l: "Grupos" }, { id: "r32", l: "R32" }, { id: "r16", l: "Octavos" },
    { id: "qf", l: "Cuartos" }, { id: "sf", l: "Semis" }, { id: "third", l: "3er" }, { id: "final", l: "Final" },
  ] as const;

  return (
    <div>
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "shrink-0 px-3 h-9 rounded-full text-xs font-semibold border",
              tab === t.id ? "bg-brand-greenDim border-brand-green text-brand-green" : "bg-surface border-border text-textMuted",
            ].join(" ")}
          >{t.l}</button>
        ))}
      </div>

      {msg && <div className="mb-3 text-xs text-brand-green">{msg}</div>}

      <div className="flex flex-col gap-2">
        {(grouped[tab] ?? []).map((m) => {
          const st = editing[m.id] ?? { home: "", away: "", home_team_code: "", away_team_code: "" };
          const knockout = m.phase !== "group";
          return (
            <Card key={m.id}>
              <div className="px-3 py-2.5 border-b border-border flex items-center justify-between text-xs">
                <span className="text-textMuted uppercase tracking-wider">
                  {m.group_name ? `Grupo ${m.group_name} · ` : ""}Slot {m.slot ?? "—"} · {new Date(m.match_date).toLocaleString("es-GT", { timeZone: "America/Guatemala" })}
                </span>
                <span className="text-textSub">{m.stadium}</span>
              </div>
              <div className="p-3 flex flex-wrap items-center gap-2">
                {knockout ? (
                  <>
                    <input
                      value={st.home_team_code ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p, [m.id]: { ...p[m.id], home_team_code: e.target.value.toUpperCase() } }))}
                      placeholder="HOME"
                      className="w-16 h-10 px-2 rounded-lg bg-surface2 border border-border text-center uppercase font-semibold"
                    />
                    <ScoreInput value={st.home} onChange={(v) => setEditing((p) => ({ ...p, [m.id]: { ...p[m.id], home: v } }))} />
                    <span className="text-textSub">—</span>
                    <ScoreInput value={st.away} onChange={(v) => setEditing((p) => ({ ...p, [m.id]: { ...p[m.id], away: v } }))} />
                    <input
                      value={st.away_team_code ?? ""}
                      onChange={(e) => setEditing((p) => ({ ...p, [m.id]: { ...p[m.id], away_team_code: e.target.value.toUpperCase() } }))}
                      placeholder="AWAY"
                      className="w-16 h-10 px-2 rounded-lg bg-surface2 border border-border text-center uppercase font-semibold"
                    />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 flex-1 justify-end">
                      <span className="text-sm font-semibold">{m.home_team_name}</span>
                      {m.home_team_flag && <Flag emoji={m.home_team_flag} size={20} />}
                    </div>
                    <ScoreInput value={st.home} onChange={(v) => setEditing((p) => ({ ...p, [m.id]: { ...p[m.id], home: v } }))} />
                    <span className="text-textSub">—</span>
                    <ScoreInput value={st.away} onChange={(v) => setEditing((p) => ({ ...p, [m.id]: { ...p[m.id], away: v } }))} />
                    <div className="flex items-center gap-1.5 flex-1">
                      {m.away_team_flag && <Flag emoji={m.away_team_flag} size={20} />}
                      <span className="text-sm font-semibold">{m.away_team_name}</span>
                    </div>
                  </>
                )}
                <button
                  onClick={() => save(m)}
                  disabled={busy === m.id}
                  className="h-10 px-4 rounded-lg bg-brand-green text-black text-sm font-bold disabled:opacity-50"
                >
                  {busy === m.id ? "…" : "Guardar"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
