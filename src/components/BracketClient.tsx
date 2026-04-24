"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Btn, Flag, ScoreInput, ProgressBar } from "./primitives";
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

  // Build R32 from group predictions
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
    const pairs = buildR32(standings);
    return pairs.map((p) => ({ slot: p.slot, home: p.home ?? null, away: p.away ?? null }));
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
    const complete = r32Picks.filter((p) => p.winnerCode).length === r32Picks.length && r32Picks.length === 16;
    if (!complete) return [];
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
    const complete = r16Picks.length === 8 && r16Picks.every((p) => p.winnerCode);
    if (!complete) return [];
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
    const complete = qfPicks.length === 4 && qfPicks.every((p) => p.winnerCode);
    if (!complete) return [];
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
    const complete = sfPicks.length === 2 && sfPicks.every((p) => p.winnerCode);
    if (!complete) return [];
    const t = thirdPlacePair(sfPicks);
    return t ? [{ slot: t.slot, home: t.home ?? null, away: t.away ?? null }] : [];
  }, [sfPicks]);

  const finalPair = useMemo<Pair[]>(() => {
    const complete = sfPicks.length === 2 && sfPicks.every((p) => p.winnerCode);
    if (!complete) return [];
    return nextRound(sfPicks, "sf").map((n) => ({ slot: n.slot, home: n.home ?? null, away: n.away ?? null }));
  }, [sfPicks]);

  const phases = [
    { id: "r32" as const, label: "R32", pairs: r32Pairs, total: 16 },
    { id: "r16" as const, label: "Octavos", pairs: r16Pairs, total: 8 },
    { id: "qf" as const, label: "Cuartos", pairs: qfPairs, total: 4 },
    { id: "sf" as const, label: "Semis", pairs: sfPairs, total: 2 },
    { id: "third" as const, label: "3er lugar", pairs: thirdPair, total: 1 },
    { id: "final" as const, label: "Final", pairs: finalPair, total: 1 },
  ];
  const activeConfig = phases.find((p) => p.id === activePhase)!;

  const completedTotal = phases.reduce((sum, ph) => {
    return sum + ph.pairs.filter((pr) => picks[`${ph.id}-${pr.slot}`]?.winner).length;
  }, 0);
  const maxTotal = 32;
  const allDone = completedTotal === maxTotal;

  const updatePick = (phase: string, slot: number, patch: Partial<{ home: string; away: string; winner: string }>) => {
    if (locked) return;
    const key = `${phase}-${slot}`;
    setPicks((prev) => {
      const next = { ...prev, [key]: { ...(prev[key] ?? { home: "", away: "", winner: "" }), ...patch } };
      const st = next[key];
      if (st.home !== "" && st.away !== "") {
        const h = Number(st.home), a = Number(st.away);
        const pair = findPair(phase, slot, { r32Pairs, r16Pairs, qfPairs, sfPairs, thirdPair, finalPair });
        if (pair?.home && pair?.away) {
          if (h > a) st.winner = pair.home.code;
          else if (a > h) st.winner = pair.away.code;
        }
      }
      return next;
    });
  };

  const setWinner = (phase: string, slot: number, code: string) => updatePick(phase, slot, { winner: code });

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
            phase,
            slot: p.slot,
            home_team_code: p.home!.code,
            away_team_code: p.away!.code,
            home_team_name: p.home!.name,
            away_team_name: p.away!.name,
            home_team_flag: p.home!.flag,
            away_team_flag: p.away!.flag,
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

  if (!hydrated) {
    return <div className="px-4 pt-20 text-center text-textMuted">Cargando tu llave…</div>;
  }

  const groupsDone = Object.keys(groupScores).length >= 72;
  if (!groupsDone) {
    return (
      <div className="px-4 pt-20">
        <Card>
          <div className="p-5 text-center">
            <div className="text-4xl mb-3">⚽</div>
            <h3 className="font-display text-xl font-bold mb-2">Primero completa tus grupos</h3>
            <p className="text-sm text-textMuted mb-4">Tu llave se construye a partir de tus predicciones de fase de grupos.</p>
            <Btn variant="gradient" onClick={() => router.push(`/pool/${poolId}/grupos`)}>
              Ir a Grupos
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-14 pb-2">
        <span className="font-display text-xs font-semibold text-brand-green uppercase tracking-[0.2em]">
          Basado en tus predicciones
        </span>
        <h2 className="font-display text-3xl font-extrabold mt-1">
          Tu Llave — {phaseDisplayName(activePhase)}
        </h2>
      </div>

      <ProgressBar value={completedTotal} max={maxTotal} label="Llaves completas" />

      {/* Phase tabs */}
      <div className="px-4 pt-3 pb-1 overflow-x-auto scroll-hide">
        <div className="flex gap-2">
          {phases.map((ph) => {
            const isActive = ph.id === activePhase;
            const unlocked = ph.pairs.length > 0 && ph.pairs.every((p) => p.home && p.away);
            const complete = ph.pairs.filter((pr) => picks[`${ph.id}-${pr.slot}`]?.winner).length === ph.total;
            return (
              <button
                key={ph.id}
                onClick={() => unlocked && setActivePhase(ph.id)}
                disabled={!unlocked}
                className={[
                  "shrink-0 px-4 h-10 rounded-full border text-sm font-semibold transition-all",
                  isActive ? "bg-brand-greenDim border-brand-green text-brand-green"
                           : unlocked ? "bg-surface border-border text-white"
                                      : "bg-surface border-border text-textSub opacity-60",
                ].join(" ")}
              >
                {ph.label} {complete && "✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pairs */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        {activeConfig.pairs.length === 0 && (
          <Card>
            <div className="p-5 text-center text-sm text-textMuted">
              Completa la fase anterior para desbloquear {activeConfig.label.toLowerCase()}.
            </div>
          </Card>
        )}
        {activeConfig.pairs.map((p) => {
          if (!p.home || !p.away) return null;
          const pick = picks[`${activePhase}-${p.slot}`] ?? { home: "", away: "", winner: "" };
          const isDone = !!pick.winner;
          return (
            <Card key={p.slot} className={isDone ? "border-brand-green/70" : ""}>
              <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
                <span className="text-[11px] text-textMuted uppercase tracking-widest">
                  {activeConfig.label} — Partido {p.slot + 1}
                </span>
                {isDone && (
                  <div className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <span className="text-[11px] text-brand-green font-semibold">Pickeado</span>
                  </div>
                )}
              </div>
              <div className="p-3.5 flex items-center gap-2">
                <button
                  onClick={() => setWinner(activePhase, p.slot, p.home!.code)}
                  disabled={locked}
                  className={[
                    "flex-1 flex items-center gap-2 justify-end px-2 py-2 rounded-lg transition-colors",
                    pick.winner === p.home!.code ? "bg-brand-greenDim" : "",
                  ].join(" ")}
                >
                  <span className="text-sm font-semibold text-right">{p.home!.name}</span>
                  <Flag emoji={p.home!.flag} size={22} />
                </button>
                <div className="flex items-center gap-1.5">
                  <ScoreInput value={pick.home} onChange={(v) => updatePick(activePhase, p.slot, { home: v })} locked={locked} />
                  <span className="font-display text-lg text-textSub">—</span>
                  <ScoreInput value={pick.away} onChange={(v) => updatePick(activePhase, p.slot, { away: v })} locked={locked} />
                </div>
                <button
                  onClick={() => setWinner(activePhase, p.slot, p.away!.code)}
                  disabled={locked}
                  className={[
                    "flex-1 flex items-center gap-2 px-2 py-2 rounded-lg transition-colors",
                    pick.winner === p.away!.code ? "bg-brand-greenDim" : "",
                  ].join(" ")}
                >
                  <Flag emoji={p.away!.flag} size={22} />
                  <span className="text-sm font-semibold">{p.away!.name}</span>
                </button>
              </div>
              {pick.home !== "" && pick.away !== "" && Number(pick.home) === Number(pick.away) && (
                <div className="px-4 pb-3 text-[11px] text-amber text-center">
                  En eliminatoria no hay empate — toca el ganador en penales.
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="px-4 pb-2">
        {saveState === "error" && <div className="text-xs text-danger">Error al enviar — reintenta</div>}
      </div>

      <div className="px-4">
        <Btn variant="gradient" onClick={submitBracket} disabled={!allDone || submitting}>
          {submitting ? "Enviando…" : allDone ? "Enviar Quiniela completa 🏆" : `Faltan ${maxTotal - completedTotal} picks`}
        </Btn>
        <p className="text-center text-[11px] text-textSub mt-2">
          Al enviar, tu quiniela queda bloqueada permanentemente.
        </p>
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
