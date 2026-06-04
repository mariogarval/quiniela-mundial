"use client";
import { useEffect, useState } from "react";
import { Card, Flag } from "./primitives";
import { getStoredUser } from "@/lib/session";

type Pick = {
  userId: string;
  userName: string;
  champion: { code: string; name: string; flag: string };
  runnerUp: { code: string; name: string; flag: string };
  thirdPlace: { code: string; name: string; flag: string } | null;
};

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

export function PoolPicksCard({ poolId }: { poolId: string }) {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myCompleted, setMyCompleted] = useState(false);

  useEffect(() => {
    const u = getStoredUser();
    if (!u.id) return;
    setMyUserId(u.id);

    // Check if current user has completed their bracket (has a final pick)
    fetch(`/api/predictions?userId=${u.id}`)
      .then((r) => r.json())
      .then((d) => {
        const bracket: { phase: string }[] = d.bracket ?? [];
        const completed = bracket.some((b) => b.phase === "final");
        setMyCompleted(completed);
        if (completed) {
          fetch(`/api/pool-picks?poolId=${poolId}`)
            .then((r) => r.json())
            .then((data) => setPicks(data.picks ?? []))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [poolId]);

  // Only show when current user has completed their bracket
  if (!myCompleted || !picks) return null;

  // Filter out current user, keep others who completed
  const others = picks.filter((p) => p.userId !== myUserId);
  if (others.length === 0) return null;

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-display text-lg font-bold uppercase tracking-wide">
          Pronósticos del grupo
        </span>
        <span className="text-xs text-textMuted">{others.length} jugadores</span>
      </div>
      <Card>
        {others.map((p, i) => (
          <div
            key={p.userId}
            className={["px-4 py-3", i < others.length - 1 ? "border-b border-border" : ""].join(" ")}
          >
            {/* User name */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-surface2 border border-border flex items-center justify-center text-[10px] font-bold text-textMuted shrink-0">
                {initials(p.userName)}
              </div>
              <span className="text-sm font-semibold">{p.userName}</span>
            </div>

            {/* Podium picks */}
            <div className="flex flex-col gap-1 pl-9">
              <PodiumRow
                pos="🥇"
                label="Campeón"
                team={p.champion}
                tone="gold"
              />
              <PodiumRow
                pos="🥈"
                label="Subcampeón"
                team={p.runnerUp}
                tone="silver"
              />
              {p.thirdPlace && (
                <PodiumRow
                  pos="🥉"
                  label="3er lugar"
                  team={p.thirdPlace}
                  tone="bronze"
                />
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function PodiumRow({
  pos,
  label,
  team,
  tone,
}: {
  pos: string;
  label: string;
  team: { name: string; flag: string };
  tone: "gold" | "silver" | "bronze";
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none">{pos}</span>
      <Flag emoji={team.flag} size={16} />
      <span className="text-xs font-medium flex-1">{team.name}</span>
      <span
        className={[
          "text-[10px] font-semibold px-1.5 py-0.5 rounded",
          tone === "gold" ? "text-gold bg-[rgba(255,215,0,0.1)]"
          : tone === "silver" ? "text-silver bg-[rgba(192,192,192,0.1)]"
          : "text-bronze bg-[rgba(205,127,50,0.1)]",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}
