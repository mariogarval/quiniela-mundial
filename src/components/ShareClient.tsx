"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Btn, Flag } from "./primitives";
import { Confetti } from "./Confetti";
import { BottomNav } from "./BottomNav";
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

export function ShareClient({ poolId, poolName }: { poolId: string; poolName: string }) {
  const router = useRouter();
  const [bracket, setBracket] = useState<BracketPick[] | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u.id) { router.replace(`/pool/${poolId}`); return; }
    fetch(`/api/predictions?userId=${u.id}`)
      .then(r => r.json())
      .then(d => setBracket(d.bracket ?? []));
  }, [poolId, router]);

  const finalPick = bracket?.find(b => b.phase === "final");
  const thirdPick = bracket?.find(b => b.phase === "third");
  const sfPicks = bracket?.filter(b => b.phase === "sf") ?? [];

  const champion = finalPick ? pickWinner(finalPick) : null;
  const runnerUp = finalPick ? pickLoser(finalPick) : null;
  const thirdPlace = thirdPick ? pickWinner(thirdPick) : null;
  const fourthPlace = thirdPick ? pickLoser(thirdPick) : null;
  const semis = sfPicks.map(pickLoser).filter(Boolean) as { code: string; name: string; flag: string }[];

  const [appUrl, setAppUrl] = useState("");
  useEffect(() => { setAppUrl(window.location.origin); }, []);

  const shareBracket = () => {
    if (!champion) return;
    track("share_clicked", { pool_id: poolId, method: "whatsapp", champion: champion.name });
    const msg = `🏆 Mi quiniela del Mundial 2026 en FUTPUL está lista.

Campeón: ${champion.flag} ${champion.name}
Final: ${runnerUp?.flag} ${runnerUp?.name}
Semifinales: ${semis.map(s => `${s.flag} ${s.name}`).join(", ")}

Únete a ${poolName}: https://futpul.com/pool/join?code=${poolId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <main
      className="min-h-screen pb-24 relative"
      style={{ background: "radial-gradient(ellipse at 50% 0%, #0F2A1A 0%, #0D0F14 60%)" }}
    >
      <Confetti />
      <div className="relative z-[2] pt-14 px-5 pb-5 text-center">
        <div className="text-5xl mb-2">🏆</div>
        <h1 className="font-display text-4xl font-extrabold text-brand-green tracking-tight">¡Quiniela enviada!</h1>
        <p className="text-sm text-textMuted mt-1">{poolName} · 64 predicciones bloqueadas</p>
      </div>

      {champion && (
        <div className="relative z-[2] px-4 pb-4">
          <Card glow className="text-center bg-gradient-to-br from-[#0A1F14] to-surface">
            <div className="p-6">
              <div className="text-[11px] text-brand-green uppercase tracking-[0.2em] mb-3">Tu campeón predicho</div>
              <div className="text-6xl mb-2 animate-float">{champion.flag}</div>
              <div className="font-display text-4xl font-extrabold">{champion.name}</div>
              <div className="text-xs text-textMuted mt-1">Campeón del Mundo 2026</div>
            </div>
          </Card>
        </div>
      )}

      {finalPick && (
        <div className="relative z-[2] px-4 pb-4">
          <Card>
            <div className="px-4 py-3 border-b border-border">
              <span className="font-display text-base font-bold uppercase tracking-wide">Tu podio</span>
            </div>
            {[
              { team: champion, label: "Campeón", tone: "gold" },
              { team: runnerUp, label: "Subcampeón", tone: "silver" },
              { team: thirdPlace, label: "Tercer puesto", tone: "bronze" },
              { team: fourthPlace, label: "Cuarto puesto", tone: "muted" },
            ].filter(r => r.team).map((r, i, arr) => (
              <div
                key={r.label}
                className={[
                  "flex items-center gap-3 px-4 py-3",
                  i < arr.length - 1 ? "border-b border-border" : "",
                  r.tone === "gold" ? "bg-[rgba(255,215,0,0.04)]" : "",
                ].join(" ")}
              >
                <Flag emoji={r.team!.flag} size={28} />
                <span className="flex-1 text-sm font-semibold">{r.team!.name}</span>
                <span
                  className={[
                    "px-2 py-0.5 rounded-lg text-[11px] font-semibold",
                    r.tone === "gold" ? "bg-[rgba(255,215,0,0.1)] text-gold" :
                    r.tone === "silver" ? "bg-[rgba(192,192,192,0.1)] text-silver" :
                    r.tone === "bronze" ? "bg-[rgba(205,127,50,0.15)] text-bronze" :
                    "text-textMuted",
                  ].join(" ")}
                >
                  {r.label}
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="relative z-[2] px-4 flex flex-col gap-2.5">
        <Btn variant="whatsapp" onClick={shareBracket}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
            <path d="M17.6 6.3A8 8 0 004.1 16.5L3 21l4.6-1.2a8 8 0 004.4 1.3 8 8 0 008-8 8 8 0 00-2.4-5.8z" />
          </svg>
          Compartir en WhatsApp
        </Btn>
      </div>

      <BottomNav poolId={poolId} />
    </main>
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
