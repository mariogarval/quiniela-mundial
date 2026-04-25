"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn, Flag, ProgressBar } from "./primitives";
import { ScoreStepper } from "./MatchRow";
import { GROUPS, GROUP_LETTERS, LOCK_DATE_ISO } from "@/lib/constants";
import { buildR32, nextRound, thirdPlacePair, type BracketNodePick } from "@/lib/bracket";
import { computeStandings } from "@/lib/standings";
import { phaseDisplayName } from "@/lib/scoring";
import { getStoredUser } from "@/lib/session";
import { track } from "@/lib/analytics";
import type { Match } from "@/types";

type Pair = {
  slot: number;
  home: { code: string; name: string; flag: string } | null;
  away: { code: string; name: string; flag: string } | null;
};

type PickState = Record<string, { home: string; away: string; winner: string }>;

export function BracketClient({
  poolId, groupMatches,
}: {
  poolId: string;
  groupMatches: Match[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [groupScores, setGroupScores] = useState<Record<string, { home: string; away: string }>>({});
  const [picks, setPicks] = useState<PickState>({});
  const [hydrated, setHydrated] = useState(false);
  const [activePhase, setActivePhase] = useState<"r32" | "r16" | "qf" | "sf" | "third" | "final">("r32");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const locked = useMemo(() => new Date(LOCK_DATE_ISO).getTime() <= Date.now(), []);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInteract = useRef(false); // only autosave after first user interaction

  useEffect(() => {
    const u = getStoredUser();
    if (!u.id) { router.replace(`/pool/${poolId}`); return; }
    setUserId(u.id);
    (async () => {
      const res = await fetch(`/api/predictions?userId=${u.id}`);
      const data = await res.json();
      const scoreMap: Record<string, { home: string; away: string }> = {};
      for (const p of data.predictions ?? []) {
        scoreMap[p.match_id] = { home: String(p.predicted_home_score), away: String(p.predicted_away_score) };
      }
      setGroupScores(scoreMap);
      const pickMap: PickState = {};
      for (const b of data.bracket ?? []) {
        pickMap[`${b.phase}-${b.slot}`] = {
          home: String(b.predicted_home_score),
          away: String(b.predicted_away_score),
          winner: b.winner_code,
        };
      }
      setPicks(pickMap);
      setHydrated(true);
      track("bracket_opened", { pool_id: poolId });
    })();
  }, [poolId, router]);

  // ── Build bracket rounds from group predictions ───────────────────────────
  const r32Pairs = useMemo<Pair[]>(() => {
    if (!hydrated) return [];
    const standings: Record<string, ReturnType<typeof computeStandings>> = {};
    const byGroup: Record<string, Match[]> = {};
    for (const m of groupMatches) if (m.group_name) (byGroup[m.group_name] ||= []).push(m);
    for (const g of GROUP_LETTERS) {
      const gm = byGroup[g] ?? [];
      standings[g] = computeStandings(
        GROUPS[g],
        gm.map((m) => ({ id: m.id, home_team_code: m.home_team_code, away_team_code: m.away_team_code })),
        groupScores,
      );
    }
    return buildR32(standings).map((p) => ({ slot: p.slot, home: p.home ?? null, away: p.away ?? null }));
  }, [hydrated, groupMatches, groupScores]);

  const r32Picks = useMemo<BracketNodePick[]>(() =>
    r32Pairs.filter((p) => p.home && p.away).map((p) => {
      const pick = picks[`r32-${p.slot}`];
      return {
        slot: p.slot,
        homeCode: p.home!.code, homeName: p.home!.name, homeFlag: p.home!.flag,
        awayCode: p.away!.code, awayName: p.away!.name, awayFlag: p.away!.flag,
        winnerCode: pick?.winner ?? "",
      };
    }),
  [r32Pairs, picks]);

  const r16Pairs = useMemo<Pair[]>(() => {
    if (r32Picks.filter((p) => p.winnerCode).length < r32Picks.length || r32Picks.length < 16) return [];
    return nextRound(r32Picks, "r32").map((n) => ({ slot: n.slot, home: n.home ?? null, away: n.away ?? null }));
  }, [r32Picks]);

  const r16Picks = useMemo<BracketNodePick[]>(() =>
    r16Pairs.filter((p) => p.home && p.away).map((p) => {
      const pick = picks[`r16-${p.slot}`];
      return {
        slot: p.slot,
        homeCode: p.home!.code, homeName: p.home!.name, homeFlag: p.home!.flag,
        awayCode: p.away!.code, awayName: p.away!.name, awayFlag: p.away!.flag,
        winnerCode: pick?.winner ?? "",
      };
    }),
  [r16Pairs, picks]);

  const qfPairs = useMemo<Pair[]>(() => {
    if (r16Picks.length < 8 || !r16Picks.every((p) => p.winnerCode)) return [];
    return nextRound(r16Picks, "r16").map((n) => ({ slot: n.slot, home: n.home ?? null, away: n.away ?? null }));
  }, [r16Picks]);

  const qfPicks = useMemo<BracketNodePick[]>(() =>
    qfPairs.filter((p) => p.home && p.away).map((p) => {
      const pick = picks[`qf-${p.slot}`];
      return {
        slot: p.slot,
        homeCode: p.home!.code, homeName: p.home!.name, homeFlag: p.home!.flag,
        awayCode: p.away!.code, awayName: p.away!.name, awayFlag: p.away!.flag,
        winnerCode: pick?.winner ?? "",
      };
    }),
  [qfPairs, picks]);

  const sfPairs = useMemo<Pair[]>(() => {
    if (qfPicks.length < 4 || !qfPicks.every((p) => p.winnerCode)) return [];
    return nextRound(qfPicks, "qf").map((n) => ({ slot: n.slot, home: n.home ?? null, away: n.away ?? null }));
  }, [qfPicks]);

  const sfPicks = useMemo<BracketNodePick[]>(() =>
    sfPairs.filter((p) => p.home && p.away).map((p) => {
      const pick = picks[`sf-${p.slot}`];
      return {
        slot: p.slot,
        homeCode: p.home!.code, homeName: p.home!.name, homeFlag: p.home!.flag,
        awayCode: p.away!.code, awayName: p.away!.name, awayFlag: p.away!.flag,
        winnerCode: pick?.winner ?? "",
      };
    }),
  [sfPairs, picks]);

  const thirdPair = useMemo<Pair[]>(() => {
    if (sfPicks.length < 2 || !sfPicks.every((p) => p.winnerCode)) return [];
    const t = thirdPlacePair(sfPicks);
    return t ? [{ slot: t.slot, home: t.home ?? null, away: t.away ?? null }] : [];
  }, [sfPicks]);

  const finalPair = useMemo<Pair[]>(() => {
    if (sfPicks.length < 2 || !sfPicks.every((p) => p.winnerCode)) return [];
    return nextRound(sfPicks, "sf").map((n) => ({ slot: n.slot, home: n.home ?? null, away: n.away ?? null }));
  }, [sfPicks]);

  const phases = [
    { id: "r32" as const,    label: "R32",       pairs: r32Pairs,  total: 16 },
    { id: "r16" as const,    label: "Octavos",   pairs: r16Pairs,  total: 8 },
    { id: "qf" as const,     label: "Cuartos",   pairs: qfPairs,   total: 4 },
    { id: "sf" as const,     label: "Semis",     pairs: sfPairs,   total: 2 },
    { id: "third" as const,  label: "3er lugar", pairs: thirdPair, total: 1 },
    { id: "final" as const,  label: "Final",     pairs: finalPair, total: 1 },
  ];
  const activeConfig = phases.find((p) => p.id === activePhase)!;

  const completedTotal = phases.reduce((sum, ph) =>
    sum + ph.pairs.filter((pr) => picks[`${ph.id}-${pr.slot}`]?.winner).length, 0);
  const allDone = completedTotal === 32;

  // ── Autosave: persist completed picks whenever they change ────────────────
  useEffect(() => {
    if (!didInteract.current || !userId || !hydrated || locked) return;

    const allPairs: Array<[string, Pair]> = [
      ...r32Pairs.map((p) => ["r32", p] as [string, Pair]),
      ...r16Pairs.map((p) => ["r16", p] as [string, Pair]),
      ...qfPairs.map((p) => ["qf", p] as [string, Pair]),
      ...sfPairs.map((p) => ["sf", p] as [string, Pair]),
      ...thirdPair.map((p) => ["third", p] as [string, Pair]),
      ...finalPair.map((p) => ["final", p] as [string, Pair]),
    ];
    const rows = allPairs
      .filter(([ph, p]) => p.home && p.away && picks[`${ph}-${p.slot}`]?.winner)
      .map(([ph, p]) => {
        const s = picks[`${ph}-${p.slot}`];
        return {
          phase: ph, slot: p.slot,
          home_team_code: p.home!.code, away_team_code: p.away!.code,
          home_team_name: p.home!.name, away_team_name: p.away!.name,
          home_team_flag: p.home!.flag, away_team_flag: p.away!.flag,
          predicted_home_score: Number(s?.home ?? 0),
          predicted_away_score: Number(s?.away ?? 0),
          winner_code: s?.winner ?? "",
        };
      });
    if (rows.length === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("saving");
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, picks: rows }),
      })
        .then((r) => { setSaveState(r.ok ? "saved" : "error"); })
        .catch(() => setSaveState("error"))
        .finally(() => setTimeout(() => setSaveState("idle"), 1500));
    }, 600);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, userId, hydrated]);

  // ── Score → winner: auto-detect from score; clear when tied (penalty needed) ─
  const updatePick = (phase: string, slot: number, patch: Partial<{ home: string; away: string; winner: string }>) => {
    if (locked) return;
    didInteract.current = true;
    const key = `${phase}-${slot}`;
    setPicks((prev) => {
      const merged = { ...(prev[key] ?? { home: "", away: "", winner: "" }), ...patch };

      // Only auto-derive winner when a score value changed (not when winner was explicitly patched)
      if (!("winner" in patch)) {
        if (merged.home !== "" && merged.away !== "") {
          const h = Number(merged.home), a = Number(merged.away);
          const pair = findPair(phase, slot, { r32Pairs, r16Pairs, qfPairs, sfPairs, thirdPair, finalPair });
          if (pair?.home && pair?.away) {
            if (h > a) merged.winner = pair.home.code;
            else if (a > h) merged.winner = pair.away.code;
            else merged.winner = ""; // Tied → must pick penalty winner below
          }
        } else {
          merged.winner = ""; // Incomplete score → no winner yet
        }
      }

      return { ...prev, [key]: merged };
    });
  };

  const submitBracket = async () => {
    if (!userId || !allDone || submitting) return;
    setSubmitting(true);
    try {
      const allPairs = [
        ...r32Pairs.map((p) => ["r32", p] as const),
        ...r16Pairs.map((p) => ["r16", p] as const),
        ...qfPairs.map((p) => ["qf", p] as const),
        ...sfPairs.map((p) => ["sf", p] as const),
        ...thirdPair.map((p) => ["third", p] as const),
        ...finalPair.map((p) => ["final", p] as const),
      ];
      const rows = allPairs
        .filter(([, p]) => p.home && p.away)
        .map(([phase, p]) => {
          const s = picks[`${phase}-${p.slot}`];
          return {
            phase, slot: p.slot,
            home_team_code: p.home!.code, away_team_code: p.away!.code,
            home_team_name: p.home!.name, away_team_name: p.away!.name,
            home_team_flag: p.home!.flag, away_team_flag: p.away!.flag,
            predicted_home_score: Number(s?.home ?? 0),
            predicted_away_score: Number(s?.away ?? 0),
            winner_code: s?.winner ?? p.home!.code,
          };
        });
      const res = await fetch("/api/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, picks: rows, submit: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error al enviar");
      track("bracket_submitted", { pool_id: poolId });
      router.push(`/pool/${poolId}/share`);
    } catch {
      setSaveState("error");
      setSubmitting(false);
    }
  };

  // ── Loading / guard states ─────────────────────────────────────────────────
  if (!hydrated) {
    return <div className="px-4 pt-20 text-center text-textMuted">Cargando tu llave…</div>;
  }

  if (Object.keys(groupScores).length < 72) {
    return (
      <div className="max-w-xl mx-auto px-4 pt-20">
        <div className="rounded-2xl border border-border bg-surface p-6 text-center">
          <div className="text-4xl mb-3">⚽</div>
          <h3 className="font-display text-xl font-bold mb-2">Primero completa tus grupos</h3>
          <p className="text-sm text-textMuted mb-4">Tu llave se construye a partir de tus predicciones de fase de grupos.</p>
          <Btn variant="gradient" onClick={() => router.push(`/pool/${poolId}/grupos`)}>
            Ir a Grupos
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="px-4 pt-14 md:pt-8 pb-2">
          <span className="font-display text-xs font-semibold text-brand-green uppercase tracking-[0.2em]">
            Basado en tus predicciones
          </span>
          <h2 className="font-display text-3xl font-extrabold mt-1">
            Tu Llave — {phaseDisplayName(activePhase)}
          </h2>
        </div>

        <ProgressBar value={completedTotal} max={32} label="Llaves completas" />

        {/* Phase tabs */}
        <div className="px-4 pt-3 pb-1 overflow-x-auto scroll-hide">
          <div className="flex gap-2">
            {phases.map((ph) => {
              const isActive = ph.id === activePhase;
              const unlocked = ph.pairs.length > 0 && ph.pairs.every((p) => p.home && p.away);
              const done = ph.pairs.filter((pr) => picks[`${ph.id}-${pr.slot}`]?.winner).length === ph.total;
              const partial = !done && ph.pairs.some((pr) => picks[`${ph.id}-${pr.slot}`]?.winner);
              return (
                <button
                  key={ph.id}
                  onClick={() => unlocked && setActivePhase(ph.id)}
                  disabled={!unlocked}
                  className={[
                    "shrink-0 px-4 h-10 rounded-full border text-sm font-semibold transition-all",
                    isActive
                      ? "bg-brand-greenDim border-brand-green text-brand-green"
                      : done
                        ? "bg-surface border-brand-green/40 text-white"
                        : partial
                          ? "bg-surface border-amber/40 text-amber"
                          : unlocked
                            ? "bg-surface border-border text-textMuted"
                            : "bg-surface border-border text-textSub opacity-40",
                  ].join(" ")}
                >
                  {ph.label}{done ? " ✓" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Match cards */}
        <div className="py-3">
          {activeConfig.pairs.length === 0 && (
            <div className="mx-4 rounded-2xl border border-border bg-surface p-5 text-center text-sm text-textMuted">
              Completa la fase anterior para desbloquear {activeConfig.label.toLowerCase()}.
            </div>
          )}
          {activeConfig.pairs.map((p) => {
            if (!p.home || !p.away) return null;
            const pick = picks[`${activePhase}-${p.slot}`] ?? { home: "", away: "", winner: "" };
            const isDone = !!pick.winner;
            const isTied = pick.home !== "" && pick.away !== "" && Number(pick.home) === Number(pick.away);

            return (
              <div
                key={p.slot}
                className="mx-4 mb-3 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0d0f14]"
              >
                {/* Card header */}
                <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
                    {activeConfig.label} — Partido {p.slot + 1}
                  </span>
                  {isDone && (
                    <div className="flex items-center gap-1">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <span className="text-[11px] text-brand-green font-semibold">Pickeado</span>
                    </div>
                  )}
                </div>

                {/* Teams + steppers (same layout as group stage MatchRow) */}
                <div className="flex items-center px-4 py-4 gap-3">
                  <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                    <span style={{ fontSize: 36, lineHeight: 1 }}>{p.home.flag}</span>
                    <span className="text-xs font-semibold text-center leading-tight text-white line-clamp-2 w-full">
                      {p.home.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <ScoreStepper
                      value={pick.home}
                      onChange={(v) => updatePick(activePhase, p.slot, { home: v })}
                      locked={locked}
                    />
                    <ScoreStepper
                      value={pick.away}
                      onChange={(v) => updatePick(activePhase, p.slot, { away: v })}
                      locked={locked}
                    />
                  </div>

                  <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                    <span style={{ fontSize: 36, lineHeight: 1 }}>{p.away.flag}</span>
                    <span className="text-xs font-semibold text-center leading-tight text-white line-clamp-2 w-full">
                      {p.away.name}
                    </span>
                  </div>
                </div>

                {/* Penalty winner selector — only when tied */}
                {isTied && !locked && (
                  <div className="px-4 pb-4">
                    <p className="text-[11px] text-amber text-center mb-2.5">
                      Sin empate en eliminatorias — ¿quién gana en penales?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updatePick(activePhase, p.slot, { winner: p.home!.code })}
                        className={[
                          "flex-1 h-10 rounded-xl border text-sm font-semibold transition-colors",
                          pick.winner === p.home!.code
                            ? "bg-brand-greenDim border-brand-green text-white"
                            : "bg-white/5 border-white/10 text-textMuted hover:text-white",
                        ].join(" ")}
                      >
                        {p.home.name}
                      </button>
                      <button
                        onClick={() => updatePick(activePhase, p.slot, { winner: p.away!.code })}
                        className={[
                          "flex-1 h-10 rounded-xl border text-sm font-semibold transition-colors",
                          pick.winner === p.away!.code
                            ? "bg-brand-greenDim border-brand-green text-white"
                            : "bg-white/5 border-white/10 text-textMuted hover:text-white",
                        ].join(" ")}
                      >
                        {p.away.name}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save status + submit */}
        <div className="px-4 pb-2 flex items-center gap-2 h-6">
          {saveState === "saving" && <><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulseDot" /><span className="text-xs text-textMuted">Guardando…</span></>}
          {saveState === "saved"  && <><span className="w-1.5 h-1.5 rounded-full bg-brand-green" /><span className="text-xs text-brand-green">Guardado</span></>}
          {saveState === "error"  && <span className="text-xs text-danger">Error al guardar — reintenta</span>}
        </div>
        <div className="px-4 pb-4">
          <Btn variant="gradient" onClick={submitBracket} disabled={!allDone || submitting}>
            {submitting ? "Enviando…" : allDone ? "Enviar Quiniela completa 🏆" : `Faltan ${32 - completedTotal} picks`}
          </Btn>
          <p className="text-center text-[11px] text-textSub mt-2">
            Al enviar, tu quiniela queda bloqueada permanentemente.
          </p>
        </div>
      </div>
    </div>
  );
}

function findPair(phase: string, slot: number, sets: {
  r32Pairs: Pair[]; r16Pairs: Pair[]; qfPairs: Pair[]; sfPairs: Pair[]; thirdPair: Pair[]; finalPair: Pair[];
}): Pair | undefined {
  const map: Record<string, Pair[]> = {
    r32: sets.r32Pairs, r16: sets.r16Pairs, qf: sets.qfPairs,
    sf: sets.sfPairs, third: sets.thirdPair, final: sets.finalPair,
  };
  return map[phase]?.find((p) => p.slot === slot);
}
