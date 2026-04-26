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
import { PAYMENTS_ENABLED } from "@/lib/flags";
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
  const [userId, setUserId] = useState<string | null>(null);
  const [aiAccess, setAiAccess] = useState<{ hasAccess: boolean; trialUsed: boolean } | null>(null);
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
      const fetches: Promise<unknown>[] = [
        fetch(`/api/predictions?userId=${u.id}`).then((r) => r.json()),
      ];
      if (PAYMENTS_ENABLED) {
        fetches.push(fetch(`/api/ai-predict?userId=${u.id}&poolId=${poolId}`).then((r) => r.json()));
      }
      Promise.all(fetches)
        .then(([predData, aiData]) => {
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
          if (PAYMENTS_ENABLED && aiData) setAiAccess(aiData as { hasAccess: boolean; trialUsed: boolean });
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
      if (res.status === 402) {
        setAiAccess({ hasAccess: false, trialUsed: true });
        return;
      }
      const data = await res.json();
      setGroupOdds(data.odds ?? null);
      setAiAccess((prev) => prev ? { ...prev, trialUsed: true } : prev);
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

  const handleOddsUnlock = async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/ai/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, poolId }),
      });
      const data = await res.json();
      if (data.unlocked) { setAiAccess({ hasAccess: true, trialUsed: true }); return; }
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch {
      // network failure — user can retry
    }
  };

  return (
    <div className="pb-24 md:pb-8">
      <div className="max-w-xl mx-auto">
      <div className="px-4 pt-14 md:pt-8 pb-2">
        <span className="font-display text-xs font-semibold text-brand-green uppercase tracking-[0.2em]">{t("phase")}</span>
        <h2 className="font-display text-3xl font-extrabold mt-1">{t("predictions")}</h2>
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

      {/* Paywall */}
      {PAYMENTS_ENABLED && aiAccess?.trialUsed && !aiAccess?.hasAccess && (
        <div className="mx-4 mb-3 rounded-xl border border-brand-green/40 bg-brand-greenDim p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📊</span>
            <span className="font-semibold text-sm">Desbloquea pronósticos para todo el torneo</span>
          </div>
          <p className="text-xs text-textMuted mb-3 pl-7">Probabilidades del mercado para los 12 grupos · Pago único de $2.99</p>
          <Btn variant="gradient" onClick={handleOddsUnlock}>Desbloquear · $2.99</Btn>
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
          {saveState === "error" && <span className="text-danger">{t("error")}</span>}
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
