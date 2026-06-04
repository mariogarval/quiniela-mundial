"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, Btn, Flag, ProgressBar } from "./primitives";
import { MatchRow } from "./MatchRow";
import { StandingsTable } from "./StandingsTable";
import { GROUPS, GROUP_LETTERS } from "@/lib/constants";
import type { Match } from "@/types";
import { getStoredUser } from "@/lib/session";
import { track } from "@/lib/analytics";

type Scores = Record<string, { home: string; away: string }>;
type MatchOdds = {
  matchId: string;
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  suggestedHome: number;
  suggestedAway: number;
  source: "odds_api" | "elo";
};

export function GruposClient({
  poolId, matches, initialScores,
}: {
  poolId: string;
  matches: Match[];
  initialScores: Scores;
}) {
  const t = useTranslations("groups");
  const [currentGroup, setCurrentGroup] = useState<string>("A");
  const [scores, setScores] = useState<Scores>(initialScores);
  const [showStandings, setShowStandings] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [groupOdds, setGroupOdds] = useState<MatchOdds[] | null>(null);
  const [oddsLoading, setOddsLoading] = useState(false);
  const [groupDeadline, setGroupDeadline] = useState<Date | null>(null);

  // Global lock: after group-stage edit deadline, nothing is editable
  const globalLocked = useMemo(() => groupDeadline ? new Date() >= groupDeadline : false, [groupDeadline]);
  // Per-match lock: freeze each match 6 hours before its own kickoff
  const isMatchLocked = (matchDate: string | null | undefined): boolean => {
    if (globalLocked) return true;
    if (!matchDate) return false;
    return new Date(matchDate).getTime() - 6 * 60 * 60 * 1000 <= Date.now();
  };
  const pendingRef = useRef<Record<string, { home: string; away: string }>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    setUserId(u.id);
    track("grupos_opened", { pool_id: poolId });
    fetch("/api/deadlines").then(r => r.json()).then(d => {
      if (d.groupEditDeadline) setGroupDeadline(new Date(d.groupEditDeadline));
    });
    if (u.id) {
      fetch(`/api/predictions?userId=${u.id}`)
        .then((r) => r.json())
        .then((predData) => {
          if ((predData as { predictions?: unknown[] })?.predictions) {
            setScores((prev) => {
              const next = { ...prev };
              for (const p of (predData as { predictions: { match_id: string; predicted_home_score: number; predicted_away_score: number }[] }).predictions) {
                next[p.match_id] = {
                  home: String(p.predicted_home_score),
                  away: String(p.predicted_away_score),
                };
              }
              return next;
            });
          }
        })
        .catch(() => {});
    }
  }, [poolId]);

  // Auto-fetch odds whenever the active group or the logged-in user changes
  useEffect(() => {
    setGroupOdds(null);
    if (!userId || globalLocked) return;
    const groupMatches = byGroup[currentGroup] ?? [];
    if (groupMatches.length === 0) return;

    const controller = new AbortController();
    setOddsLoading(true);
    fetch("/api/ai-predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        poolId,
        matches: groupMatches.map((m) => ({
          id: m.id,
          homeCode: m.home_team_code ?? "",
          awayCode: m.away_team_code ?? "",
        })),
      }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.odds) setGroupOdds(data.odds); })
      .catch(() => {})
      .finally(() => setOddsLoading(false));

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup, userId]);

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
    if (!userId || globalLocked) return;
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
    setSaveError(null);
    let errMsg: string | null = null;
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, predictions: payload }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        errMsg = (errData as { error?: string }).error ?? `HTTP ${res.status}`;
        throw new Error(errMsg);
      }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (err) {
      setSaveState("error");
      setSaveError(errMsg ?? (err instanceof Error ? err.message : "save failed"));
    }
  };

  const setScore = (matchId: string, side: "home" | "away", value: string) => {
    const matchDate = matches.find((m) => m.id === matchId)?.match_date;
    if (isMatchLocked(matchDate)) return;
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
    const groupsDoneCount = GROUP_LETTERS.filter((g) =>
      (byGroup[g] ?? []).every((m) => scores[m.id]?.home !== "" && scores[m.id]?.away !== "")
    ).length;
    track("group_saved", { pool_id: poolId, group: currentGroup, groups_done: groupsDoneCount });
    if (groupsDoneCount >= GROUP_LETTERS.length) {
      track("all_groups_done", { pool_id: poolId });
    }
    const idx = GROUP_LETTERS.indexOf(currentGroup as typeof GROUP_LETTERS[number]);
    if (idx < GROUP_LETTERS.length - 1) {
      setCurrentGroup(GROUP_LETTERS[idx + 1]);
    }
  };

  const handleOddsFetch = async () => {
    if (!userId || globalLocked) return;
    track("odds_panel_opened", { pool_id: poolId, group: currentGroup });
    setOddsLoading(true);
    try {
      const res = await fetch("/api/ai-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          poolId,
          matches: currentMatches.map((m) => ({
            id: m.id,
            homeCode: m.home_team_code ?? "",
            awayCode: m.away_team_code ?? "",
          })),
        }),
      });
      const data = await res.json();
      setGroupOdds(data.odds ?? null);
    } finally {
      setOddsLoading(false);
    }
  };

  const applyOdds = () => {
    if (!groupOdds || globalLocked) return;
    track("odds_applied", { pool_id: poolId, group: currentGroup, source: groupOdds[0]?.source });
    for (const o of groupOdds) {
      setScore(o.matchId, "home", String(o.suggestedHome));
      setScore(o.matchId, "away", String(o.suggestedAway));
    }
  };

  return (
    <div className="pb-24 md:pb-8">
      <div className="max-w-xl mx-auto">
      <div className="px-4 pt-14 md:pt-8 pb-2">
        <span className="font-display text-xs font-semibold text-brand-green uppercase tracking-[0.2em]">{t("phase")}</span>
        <h2 className="font-display text-3xl font-extrabold mt-1">{t("predictions")}</h2>
      </div>

      {/* Instructions toggle */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowInstructions((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-surface text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <span>¿Cómo funciona la quiniela?</span>
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            className={["transition-transform", showInstructions ? "rotate-180" : ""].join(" ")}
          >
            <path d="M6 9l6 6 6-6" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showInstructions && (
          <div className="mt-2 rounded-xl border border-border bg-surface p-4 space-y-4 text-sm">
            {/* Steps */}
            <div className="space-y-2">
              <p className="text-xs text-textMuted font-semibold uppercase tracking-widest">Pasos</p>
              {[
                ["1️⃣", "Llena los marcadores de los 72 partidos de fase de grupos (12 grupos × 6 partidos)."],
                ["2️⃣", "Avanza a la Llave Eliminatoria y elige quién gana cada ronda hasta la final."],
                ["3️⃣", "¡Guarda antes del cierre! Cada partido se bloquea 6 horas antes de su inicio."],
              ].map(([icon, text]) => (
                <div key={icon} className="flex gap-2.5">
                  <span className="shrink-0">{icon}</span>
                  <span className="text-textMuted">{text}</span>
                </div>
              ))}
            </div>

            {/* Scoring */}
            <div>
              <p className="text-xs text-textMuted font-semibold uppercase tracking-widest mb-2">Puntos</p>
              <div className="space-y-1">
                <ScoringRow label="Marcador exacto (grupos)" pts={5} color="green" />
                <ScoringRow label="Resultado correcto (grupos)" pts={3} color="green" />
                <ScoringRow label="Ganador + marcador exacto (eliminatoria)" pts={8} color="amber" />
                <ScoringRow label="Solo ganador correcto (eliminatoria)" pts={5} color="amber" />
                <ScoringRow label="Wildcard — equipo avanzó en otra llave" pts={2} color="amber" />
                <ScoringRow label="Campeón del grupo (bonus)" pts={5} color="blue" />
                <ScoringRow label="Subcampeón del grupo (bonus)" pts={3} color="blue" />
                <ScoringRow label="Tercer lugar del grupo (bonus)" pts={2} color="blue" />
                <ScoringRow label="Campeón del torneo (bonus máximo)" pts={15} color="gold" />
              </div>
            </div>
          </div>
        )}
      </div>

      <ProgressBar value={totalCompleted} max={72} label={t("totalLabel")} />

      {/* Deadline banner */}
      {groupDeadline && (
        <div className="px-4 pb-2">
          {globalLocked
            ? <div className="rounded-xl border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">{t("locked")}</div>
            : <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-textMuted">{t("editDeadline", { date: formatGroupDeadline(groupDeadline) })}</div>
          }
        </div>
      )}

      {/* Group selector */}
      <div className="px-4 pt-3 pb-1 overflow-x-auto scroll-hide">
        <div className="flex gap-2">
          {GROUP_LETTERS.map((g) => {
            const activeG = g === currentGroup;
            const groupMatches = byGroup[g] ?? [];
            const filled = (m: Match) => {
              const s = scores[m.id];
              return s !== undefined && s.home !== "" && s.away !== "";
            };
            const completedCount = groupMatches.filter(filled).length;
            const done = groupMatches.length > 0 && completedCount === groupMatches.length;
            const partial = completedCount > 0 && !done;
            return (
              <button
                key={g}
                onClick={() => setCurrentGroup(g)}
                className={[
                  "shrink-0 px-4 h-10 rounded-full border text-sm font-semibold transition-all",
                  activeG
                    ? "bg-brand-greenDim border-brand-green text-brand-green"
                    : done
                      ? "bg-surface border-brand-green/40 text-white"
                      : partial
                        ? "bg-surface border-amber/40 text-amber"
                        : "bg-surface border-border text-textMuted",
                ].join(" ")}
              >
                {t("groupLabel")} {g}{done ? " ✓" : partial ? ` ${completedCount}/${groupMatches.length}` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group header card */}
      <div className="px-4 pt-3 pb-2">
        <Card>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-brand-greenDim border border-brand-green flex items-center justify-center font-display text-xl font-extrabold text-brand-green">
                {currentGroup}
              </div>
              <div>
                <div className="font-display text-lg font-bold">{t("groupLabel")} {currentGroup}</div>
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
        </Card>
      </div>

      {/* Match cards — one card per game */}
      {currentMatches.map((m) => {
        const row = scores[m.id] ?? { home: "", away: "" };
        const odds = groupOdds?.find((o) => o.matchId === m.id);
        return (
          <MatchRow
            key={m.id}
            match={{
              id: m.id,
              homeName: m.home_team_name ?? "",
              awayName: m.away_team_name ?? "",
              homeFlag: m.home_team_flag ?? "",
              awayFlag: m.away_team_flag ?? "",
              homeCode: m.home_team_code,
              awayCode: m.away_team_code,
              date: m.match_date,
              stadium: m.stadium,
            }}
            score={row}
            onScore={(side, val) => setScore(m.id, side, val)}
            locked={isMatchLocked(m.match_date)}
            odds={odds}
          />
        );
      })}

      {/* Apply market suggestions */}
      {groupOdds && !globalLocked && (
        <div className="px-4 pb-3 flex items-center justify-between">
          <span className="text-xs text-textMuted">
            {groupOdds[0]?.source === "odds_api" ? "Casas de apuestas" : "Ranking FIFA"}
          </span>
          <button
            onClick={applyOdds}
            className="px-3 h-8 rounded-lg border border-brand-green/60 text-brand-green text-xs font-semibold"
          >
            {t("applyOdds")}
          </button>
        </div>
      )}

      {/* Toggle standings */}
      <div className="px-4 pb-3">
        <button
          onClick={() => {
            setShowStandings((s) => {
              track("standings_toggled", { pool_id: poolId, group: currentGroup, showing: !s });
              return !s;
            });
          }}
          className="w-full h-11 rounded-xl border border-borderHi bg-transparent flex items-center justify-center gap-2 text-sm font-semibold"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" stroke="#00E676" strokeWidth="1.8" />
          </svg>
          {showStandings ? t("hideStandings") : t("showStandings")}
        </button>
      </div>

      {showStandings && (
        <div className="animate-slideUp">
          <StandingsTable teams={currentTeams} matches={currentMatches} scores={scores} />
        </div>
      )}

      <div className="px-4 pt-2 pb-2">
        <div className="flex items-center gap-2 text-xs h-5">
          {saveState === "saving" && <><span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulseDot" /><span className="text-textMuted">{t("saving")}</span></>}
          {saveState === "saved" && <><span className="w-1.5 h-1.5 rounded-full bg-brand-green" /><span className="text-brand-green">{t("saved")}</span></>}
          {saveState === "error" && <span className="text-danger">{saveError ? `Error: ${saveError}` : t("error")}</span>}
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
              ? t("saving")
              : currentGroupDone
                ? `${t("saveGroup")} ${currentGroup} →`
                : `Completa el ${t("groupLabel")} ${currentGroup} (${groupCompleted}/6)`}
          </Btn>
        )}
      </div>
      </div>
    </div>
  );
}

function formatGroupDeadline(d: Date): string {
  return d.toLocaleString("es-MX", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
}

function ScoringRow({ label, pts, color }: { label: string; pts: number; color: "green" | "amber" | "blue" | "gold" }) {
  const badge = {
    green: "bg-brand-greenDim text-brand-green",
    amber: "bg-[rgba(255,193,7,0.1)] text-amber",
    blue: "bg-[rgba(100,160,255,0.1)] text-[#64A0FF]",
    gold: "bg-[rgba(255,215,0,0.1)] text-gold",
  }[color];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-textMuted text-xs">{label}</span>
      <span className={["shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg", badge].join(" ")}>+{pts} pts</span>
    </div>
  );
}
