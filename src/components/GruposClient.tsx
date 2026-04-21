"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, Btn, Flag, ProgressBar } from "./primitives";
import { MatchRow } from "./MatchRow";
import { StandingsTable } from "./StandingsTable";
import { GROUPS, GROUP_LETTERS, LOCK_DATE_ISO } from "@/lib/constants";
import type { Match } from "@/types";
import { getStoredUser } from "@/lib/session";

type Scores = Record<string, { home: string; away: string }>;

export function GruposClient({
  poolId, matches, initialScores,
}: {
  poolId: string;
  matches: Match[];
  initialScores: Scores;
}) {
  const [currentGroup, setCurrentGroup] = useState<string>("A");
  const [scores, setScores] = useState<Scores>(initialScores);
  const [showStandings, setShowStandings] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [userId, setUserId] = useState<string | null>(null);
  const locked = useMemo(() => new Date(LOCK_DATE_ISO).getTime() <= Date.now(), []);
  const pendingRef = useRef<Record<string, { home: string; away: string }>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    setUserId(u.id);
    if (u.id) {
      fetch(`/api/predictions?userId=${u.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data?.predictions) return;
          setScores((prev) => {
            const next = { ...prev };
            for (const p of data.predictions) {
              next[p.match_id] = {
                home: String(p.predicted_home_score),
                away: String(p.predicted_away_score),
              };
            }
            return next;
          });
        })
        .catch(() => {});
    }
  }, []);

  const byGroup = useMemo(() => {
    const m: Record<string, Match[]> = {};
    for (const mt of matches) if (mt.group_name) (m[mt.group_name] ||= []).push(mt);
    return m;
  }, [matches]);

  const currentMatches = byGroup[currentGroup] ?? [];
  const currentTeams = GROUPS[currentGroup] ?? [];

  const totalCompleted = Object.values(scores).filter((s) => s.home !== "" && s.away !== "").length;
  const groupCompleted = currentMatches
    .map((m) => scores[m.id])
    .filter((s) => s && s.home !== "" && s.away !== "").length;

  const allDone = totalCompleted === 72;
  const currentGroupDone = groupCompleted === currentMatches.length && currentMatches.length > 0;

  const flush = async () => {
    if (!userId || locked) return;
    const pending = pendingRef.current;
    pendingRef.current = {};
    const payload = Object.entries(pending)
      .filter(([, v]) => v.home !== "" && v.away !== "")
      .map(([match_id, v]) => ({
        match_id,
        predicted_home_score: Number(v.home),
        predicted_away_score: Number(v.away),
      }));
    if (payload.length === 0) { setSaveState("idle"); return; }
    setSaveState("saving");
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, predictions: payload }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch {
      setSaveState("error");
    }
  };

  const setScore = (matchId: string, side: "home" | "away", value: string) => {
    if (locked) return;
    setScores((prev) => {
      const next = { ...prev, [matchId]: { ...(prev[matchId] ?? { home: "", away: "" }), [side]: value } };
      pendingRef.current[matchId] = next[matchId];
      return next;
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 600);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const saveGroupAndAdvance = async () => {
    await flush();
    const idx = GROUP_LETTERS.indexOf(currentGroup as typeof GROUP_LETTERS[number]);
    if (idx < GROUP_LETTERS.length - 1) {
      setCurrentGroup(GROUP_LETTERS[idx + 1]);
    }
  };

  return (
    <div className="pb-24">
      <div className="px-4 pt-14 pb-2">
        <span className="font-display text-xs font-semibold text-brand-green uppercase tracking-[0.2em]">Fase de Grupos</span>
        <h2 className="font-display text-3xl font-extrabold mt-1">Tus Predicciones</h2>
      </div>

      <ProgressBar value={totalCompleted} max={72} label="Predicciones totales" />

      {/* Group selector */}
      <div className="px-4 pt-3 pb-1 overflow-x-auto scroll-hide">
        <div className="flex gap-2">
          {GROUP_LETTERS.map((g) => {
            const activeG = g === currentGroup;
            const done = (byGroup[g] ?? []).every((m) => scores[m.id]?.home !== "" && scores[m.id]?.away !== "");
            return (
              <button
                key={g}
                onClick={() => setCurrentGroup(g)}
                className={[
                  "shrink-0 px-4 h-10 rounded-full border text-sm font-semibold transition-all",
                  activeG ? "bg-brand-greenDim border-brand-green text-brand-green"
                          : done ? "bg-surface border-brand-green/40 text-white"
                                 : "bg-surface border-border text-textMuted",
                ].join(" ")}
              >
                Grupo {g} {done && "✓"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group card */}
      <div className="px-4 py-3">
        <Card>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-brand-greenDim border border-brand-green flex items-center justify-center font-display text-xl font-extrabold text-brand-green">
                {currentGroup}
              </div>
              <div>
                <div className="font-display text-lg font-bold">Grupo {currentGroup}</div>
                <div className="flex gap-1 mt-0.5">
                  {currentTeams.map((t) => (
                    <Flag key={t.code} emoji={t.flag} size={14} />
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-textMuted uppercase tracking-wide">{groupCompleted}/6</div>
              <div className="font-display text-lg font-bold">{currentTeams.length}</div>
            </div>
          </div>

          {currentMatches.map((m) => {
            const row = scores[m.id] ?? { home: "", away: "" };
            return (
              <MatchRow
                key={m.id}
                match={{
                  id: m.id,
                  homeName: m.home_team_name ?? "",
                  awayName: m.away_team_name ?? "",
                  homeFlag: m.home_team_flag ?? "",
                  awayFlag: m.away_team_flag ?? "",
                  date: m.match_date,
                  stadium: m.stadium,
                }}
                score={row}
                onScore={(side, val) => setScore(m.id, side, val)}
                locked={locked}
              />
            );
          })}
        </Card>
      </div>

      {/* Toggle standings */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setShowStandings((s) => !s)}
          className="w-full h-11 rounded-xl border border-borderHi bg-transparent flex items-center justify-center gap-2 text-sm font-semibold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" stroke="#00E676" strokeWidth="1.8" />
          </svg>
          {showStandings ? "Ocultar tabla" : "Ver tabla predictiva"}
        </button>
      </div>

      {showStandings && (
        <div className="animate-slideUp">
          <StandingsTable teams={currentTeams} matches={currentMatches} scores={scores} />
        </div>
      )}

      <div className="px-4 pt-2 pb-2">
        <div className="flex items-center gap-2 text-xs h-5">
          {saveState === "saving" && <><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulseDot" /><span className="text-textMuted">Guardando…</span></>}
          {saveState === "saved" && <><span className="w-1.5 h-1.5 rounded-full bg-brand-green" /><span className="text-brand-green">Guardado</span></>}
          {saveState === "error" && <span className="text-danger">Error al guardar — reintenta</span>}
        </div>
      </div>

      <div className="px-4">
        {allDone ? (
          <Link href={`/pool/${poolId}/bracket`} className="block">
            <Btn variant="gradient">Continuar → Tu Llave</Btn>
          </Link>
        ) : (
          <Btn
            variant="gradient"
            disabled={!currentGroupDone || saveState === "saving"}
            onClick={saveGroupAndAdvance}
          >
            {saveState === "saving"
              ? "Guardando…"
              : currentGroupDone
                ? `Guardar Grupo ${currentGroup} →`
                : `Completa el Grupo ${currentGroup} (${groupCompleted}/6)`}
          </Btn>
        )}
      </div>
    </div>
  );
}
