import { notFound } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/primitives";
import { loadPoolWithPlayers } from "@/lib/data";
import { getServerClient } from "@/lib/supabase";
import { PAYMENTS_ENABLED } from "@/lib/flags";

export default async function RankingPage({ params }: { params: { id: string } }) {
  const { pool, players } = await loadPoolWithPlayers(params.id);
  if (!pool) return notFound();

  const sb = getServerClient();
  const { data: points } = await sb.from("points").select("user_id, points_earned").eq("pool_id", pool.id);
  const totals = new Map<string, number>();
  for (const row of points ?? []) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + (row.points_earned as number));
  }
  const rows = players
    .map((p) => ({ ...p, pts: totals.get(p.id) ?? 0 }))
    .sort((a, b) => b.pts - a.pts);

  const frozen = PAYMENTS_ENABLED && pool.plan === "free" && pool.payment_status === "none";

  return (
    <main className="min-h-screen bg-bg pb-24">
      <div className="bg-gradient-to-b from-[#0F1624] to-bg pt-14 pb-4 px-4">
        <h2 className="font-display text-3xl font-extrabold">{pool.name}</h2>
        <p className="text-sm text-textMuted mt-1 mb-4">{players.length} participantes</p>
        {frozen && (
          <Card glow>
            <div className="p-3 text-xs">
              <div className="flex items-center gap-1.5 text-amber font-semibold mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                Ranking congelado después de grupos
              </div>
              <p className="text-textMuted">
                El admin puede desbloquear eliminatorias por $9 (Lemon Squeezy).
              </p>
            </div>
          </Card>
        )}
      </div>

      <div className="px-4 py-2">
        <Card>
          {rows.length === 0 && (
            <div className="p-6 text-center text-sm text-textMuted">Aún no hay puntos. Entra luego del primer partido real.</div>
          )}
          {rows.map((p, i) => {
            const badge = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : null;
            const badgeColor = badge === "gold" ? "text-gold" : badge === "silver" ? "text-silver" : "text-bronze";
            const badgeBg = badge === "gold" ? "bg-[rgba(255,215,0,0.15)]" : badge === "silver" ? "bg-[rgba(192,192,192,0.15)]" : badge === "bronze" ? "bg-[rgba(205,127,50,0.15)]" : "";
            const isMe = false;
            return (
              <div
                key={p.id}
                className={[
                  "flex items-center gap-3 px-4 py-3",
                  i < rows.length - 1 ? "border-b border-border" : "",
                  isMe ? "bg-brand-greenDim/40" : "",
                ].join(" ")}
              >
                {badge ? (
                  <div className={["w-7 h-7 rounded-full border flex items-center justify-center font-display text-sm font-extrabold", badgeColor, badgeBg].join(" ")}>
                    {i + 1}
                  </div>
                ) : (
                  <div className="w-7 text-center font-display text-base font-bold text-textMuted">{i + 1}</div>
                )}
                <div className="w-9 h-9 rounded-full bg-surface2 border border-border flex items-center justify-center text-xs font-bold text-textMuted">
                  {initials(p.name)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-[11px] text-textMuted">{p.pts} pts</div>
                </div>
                <div className="font-display text-2xl font-bold min-w-[36px] text-right">{p.pts}</div>
              </div>
            );
          })}
        </Card>
      </div>

      <BottomNav poolId={pool.id} />
    </main>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}
