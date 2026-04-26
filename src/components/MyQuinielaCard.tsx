"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, Btn, Flag } from "./primitives";
import { InstagramShareButton } from "./InstagramShareCard";
import { getStoredUser } from "@/lib/session";
import { track } from "@/lib/analytics";

type BracketPick = {
  phase: string;
  slot: number;
  home_team_code: string;
  away_team_code: string;
  home_team_name: string;
  away_team_name: string;
  home_team_flag: string;
  away_team_flag: string;
  winner_code: string;
};

export function MyQuinielaCard({ poolId, poolName }: { poolId: string; poolName: string }) {
  const t = useTranslations("share");
  const [bracket, setBracket] = useState<BracketPick[] | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u.id) return;
    fetch(`/api/predictions?userId=${u.id}`)
      .then((r) => r.json())
      .then((d) => setBracket(d.bracket ?? []))
      .catch(() => {});
  }, []);

  const finalPick = bracket?.find((b) => b.phase === "final");
  const thirdPick = bracket?.find((b) => b.phase === "third");

  // Only render if user has at least the final pick (i.e. completed their bracket)
  if (!finalPick) return null;

  const champion = pickWinner(finalPick);
  const runnerUp = pickLoser(finalPick);
  const thirdPlace = thirdPick ? pickWinner(thirdPick) : null;
  const sfPicks = bracket?.filter((b) => b.phase === "sf") ?? [];
  const semis = sfPicks.map(pickLoser);

  const shareWhatsApp = () => {
    track("share_clicked", { pool_id: poolId, method: "whatsapp", champion: champion.name, surface: "home" });
    const msg = t("whatsappText", {
      championFlag: champion.flag,
      championName: champion.name,
      runnerUpFlag: runnerUp.flag,
      runnerUpName: runnerUp.name,
      semis: semis.map((s) => `${s.flag} ${s.name}`).join(", "),
      poolName,
      poolId,
    });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="px-4 pb-4">
      <Card glow className="bg-gradient-to-br from-[#0A1F14] to-surface">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="font-display text-sm font-bold uppercase tracking-wide text-brand-green">
            🏆 {t("submitted")}
          </span>
          <Link href={`/pool/${poolId}/share`} className="text-xs text-brand-green">
            {t("viewFull")} →
          </Link>
        </div>

        {/* Champion */}
        <div className="p-5 text-center border-b border-border">
          <div className="text-[10px] text-brand-green uppercase tracking-[0.2em] mb-2">{t("champion")}</div>
          <div className="text-5xl mb-1">{champion.flag}</div>
          <div className="font-display text-2xl font-extrabold">{champion.name}</div>
        </div>

        {/* Podium */}
        <div className="px-4 py-3 border-b border-border space-y-2">
          {[
            { team: champion, label: t("pos1"), tone: "gold" as const },
            { team: runnerUp, label: t("pos2"), tone: "silver" as const },
            ...(thirdPlace ? [{ team: thirdPlace, label: t("pos3"), tone: "bronze" as const }] : []),
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <Flag emoji={r.team.flag} size={22} />
              <span className="flex-1 text-sm font-semibold">{r.team.name}</span>
              <span
                className={[
                  "px-2 py-0.5 rounded-lg text-[10px] font-semibold",
                  r.tone === "gold" ? "bg-[rgba(255,215,0,0.1)] text-gold"
                  : r.tone === "silver" ? "bg-[rgba(192,192,192,0.1)] text-silver"
                  : "bg-[rgba(205,127,50,0.15)] text-bronze",
                ].join(" ")}
              >
                {r.label}
              </span>
            </div>
          ))}
        </div>

        {/* Share buttons */}
        <div className="p-4 flex flex-col gap-2">
          <Btn variant="whatsapp" onClick={shareWhatsApp}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000">
              <path d="M17.6 6.3A8 8 0 004.1 16.5L3 21l4.6-1.2a8 8 0 004.4 1.3 8 8 0 008-8 8 8 0 00-2.4-5.8z" />
            </svg>
            {t("whatsapp")}
          </Btn>
          <InstagramShareButton
            data={{
              champion: { name: champion.name, flag: champion.flag },
              runnerUp: { name: runnerUp.name, flag: runnerUp.flag },
              thirdPlace: thirdPlace ? { name: thirdPlace.name, flag: thirdPlace.flag } : null,
              poolName,
            }}
          />
        </div>
      </Card>
    </div>
  );
}

function pickWinner(b: BracketPick) {
  return b.winner_code === b.home_team_code
    ? { code: b.home_team_code, name: b.home_team_name, flag: b.home_team_flag }
    : { code: b.away_team_code, name: b.away_team_name, flag: b.away_team_flag };
}
function pickLoser(b: BracketPick) {
  return b.winner_code === b.home_team_code
    ? { code: b.away_team_code, name: b.away_team_name, flag: b.away_team_flag }
    : { code: b.home_team_code, name: b.home_team_name, flag: b.home_team_flag };
}
