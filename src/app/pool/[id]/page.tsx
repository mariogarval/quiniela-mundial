import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Btn, Pill } from "@/components/primitives";
import { BottomNav } from "@/components/BottomNav";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PoolCodeCard } from "@/components/PoolCodeCard";
import { loadPoolWithPlayers } from "@/lib/data";
import { LOCK_DATE_ISO, GROUP_LETTERS } from "@/lib/constants";
import { getServerClient } from "@/lib/supabase";

export default async function PoolHomePage({ params }: { params: { id: string } }) {
  const { pool, players } = await loadPoolWithPlayers(params.id);
  if (!pool) return notFound();

  const sb = getServerClient();
  const { data: leaderboard } = await sb
    .from("points")
    .select("user_id, points_earned")
    .eq("pool_id", pool.id);

  const totals = new Map<string, number>();
  for (const row of leaderboard ?? []) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.points_earned as number));
  }
  const leaders = players
    .map((p) => ({ ...p, pts: totals.get(p.id) ?? 0 }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3);

  const { count: totalMatches } = await sb.from("matches").select("id", { count: "exact", head: true });

  return (
    <main className="min-h-screen bg-bg pb-24">
      {/* Header with gradient */}
      <div className="bg-gradient-to-b from-[#0F1624] to-bg pt-14 pb-4 px-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚽</span>
              <span className="text-xs font-semibold text-brand-green uppercase tracking-[0.2em] font-display">
                World Cup 2026
              </span>
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-none">{pool.name}</h1>
            <p className="text-xs text-textMuted mt-1">
              Admin: <span className="text-white">{players.find((p) => p.is_admin)?.name ?? "—"}</span>
            </p>
            <p className="text-[10px] text-textSub mt-0.5">{players.length} jugadores</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-brand-greenDim border border-brand-green flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" stroke="#00E676" strokeWidth="1.8" />
              <path d="M12 2c0 0-3 4-3 10s3 10 3 10M12 2c0 0 3 4 3 10s-3 10-3 10M2 12h20M3.5 7h17M3.5 17h17" stroke="#00E676" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Stat val={String(players.length)} label="Jugadores" />
          <Stat val="Jun 13" label="Inicio" />
          <Stat val={String(totalMatches ?? 64)} label="Partidos" />
        </div>
      </div>

      {/* Countdown */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulseDot" />
          <span className="text-xs text-textMuted uppercase tracking-widest">Cierra en</span>
        </div>
        <CountdownTimer targetIso={LOCK_DATE_ISO} />
      </div>

      {/* Join code share card */}
      <PoolCodeCard
        joinCode={pool.join_code}
        poolName={pool.name}
      />

      {/* CTA */}
      <div className="px-4 pb-4">
        <Link href={`/pool/${pool.id}/grupos`} className="block">
          <Btn variant="gradient" className="h-14 text-lg rounded-2xl">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            Completar mi quiniela
          </Btn>
        </Link>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <Card>
          <div className="pt-3 px-4 pb-3">
            <div className="flex justify-between mb-2">
              <span className="text-xs text-textMuted">Grupos</span>
              <span className="text-xs font-semibold text-brand-green">8</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GROUP_LETTERS.map((g, i) => (
                <Pill key={g} active={i === 0}>Grupo {g}</Pill>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Leaderboard preview */}
      {leaders.length > 0 && (
        <div className="px-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-display text-lg font-bold uppercase tracking-wide">Top 3 Ranking</span>
            <Link href={`/pool/${pool.id}/ranking`} className="text-xs text-brand-green">
              Ver todos →
            </Link>
          </div>
          <Card>
            {leaders.map((l, i) => (
              <div
                key={l.id}
                className={[
                  "flex items-center gap-3 px-4 py-3",
                  i < leaders.length - 1 ? "border-b border-border" : "",
                ].join(" ")}
              >
                <div className={["w-6 h-6 rounded-full flex items-center justify-center font-display text-sm font-extrabold",
                  i === 0 ? "bg-[rgba(255,215,0,0.15)] text-gold"
                  : i === 1 ? "bg-[rgba(192,192,192,0.15)] text-silver"
                  : "bg-[rgba(205,127,50,0.15)] text-bronze",
                ].join(" ")}>{i + 1}</div>
                <div className="w-9 h-9 rounded-full bg-surface2 border border-border flex items-center justify-center text-xs font-bold text-textMuted">
                  {initials(l.name)}
                </div>
                <span className="flex-1 text-sm font-medium">{l.name}</span>
                <div className="text-right">
                  <div className="font-display text-xl font-bold">{l.pts}</div>
                  <div className="text-[10px] text-brand-green">pts</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <BottomNav poolId={pool.id} />
    </main>
  );
}

function Stat({ val, label }: { val: string; label: string }) {
  return (
    <div className="flex-1 bg-surface border border-border rounded-xl py-2.5 text-center">
      <div className="font-display text-xl font-bold">{val}</div>
      <div className="text-[10px] text-textMuted uppercase tracking-wide">{label}</div>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}
